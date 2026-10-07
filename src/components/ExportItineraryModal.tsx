import { useState, useEffect } from 'react';
import { X, Printer, Download, MapPin, Calendar, CheckCircle2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { tripsApi, destinationsApi, budgetApi } from '../services/api';
import { mergeTripWithExtras } from '../lib/tripExtras';
import { formatUserDate } from '../lib/formatters';
import type { Trip } from '../types/trip';
import type { WorkspaceDestination } from '../pages/TripWorkspace';
import { getCountryId } from '../lib/countries';

interface ExportItineraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
}

export default function ExportItineraryModal({
  isOpen,
  onClose,
  tripId,
}: ExportItineraryModalProps) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [destinations, setDestinations] = useState<WorkspaceDestination[]>([]);
  const [budget, setBudget] = useState<{
    total: number;
    balance: number;
    expenses: Array<{
      id?: string | number;
      name: string;
      cost: number;
      category: string;
    }>;
  }>({
    total: 0,
    balance: 0,
    expenses: [],
  });
  const [loading, setLoading] = useState(false);
  const [exportError, setExportError] = useState('');

  useEffect(() => {
    if (!isOpen || !tripId) return;

    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      try {
        const apiTrip = await tripsApi.getTrip(tripId);
        if (cancelled) return;
        const merged = mergeTripWithExtras(apiTrip);
        setTrip(merged);

        const serverDestinations = await destinationsApi.getByTripIdStrict(tripId);
        const dests: WorkspaceDestination[] = serverDestinations
          .slice()
          .sort((a, b) => Number(a.order_sequence || 0) - Number(b.order_sequence || 0))
          .map((destination, index) => ({
            id: String(destination.id),
            name: destination.location_name,
            countryId: getCountryId(destination.country) || '',
            country: destination.country || '',
            order: Number(destination.order_sequence) || index,
            days: Number(destination.days) || 1,
            nights: Number(destination.days) || 1,
            accommodation: destination.accommodation || '',
            accommodationId: destination.accommodation_id ?? null,
            activities: destination.activities || '',
            transportation: destination.transportation || '',
          }));
        setDestinations(dests);

        // Load budget data
        try {
          const budgetData = await budgetApi.getBudget(tripId);
          if (!cancelled && budgetData) {
            setBudget({
              total: merged.totalBudget || 0,
              balance: budgetData.balance || 0,
              expenses: budgetData.expenses || [],
            });
          }
        } catch {
          // Fallback if budget api fails
          setBudget({
            total: merged.totalBudget || 0,
            balance: merged.totalBudget || 0,
            expenses: [],
          });
        }
      } catch (err) {
        console.error('Failed to load trip for export:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadData();
    return () => {
      cancelled = true;
    };
  }, [isOpen, tripId]);

  if (!isOpen) return null;

  const handleDownloadPdf = () => {
    if (!trip) return;
    setExportError('');
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const orange: [number, number, number] = [233, 114, 76];
      const ink: [number, number, number] = [47, 27, 12];
      doc.setFillColor(...orange);
      doc.rect(0, 0, doc.internal.pageSize.getWidth(), 8, 'F');
      doc.setTextColor(...ink);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(21);
      doc.text('LakBye', 14, 21);
      doc.setFontSize(16);
      const titleLines = doc.splitTextToSize(trip.name, 269) as string[];
      doc.text(titleLines, 14, 31);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(110, 96, 84);
      let metadataY = 31 + titleLines.length * 7;
      const dateLabel =
        trip.startDate && trip.endDate
          ? `${formatUserDate(trip.startDate)} - ${formatUserDate(trip.endDate)}`
          : 'Dates not set';
      doc.text(`Travel dates: ${dateLabel}`, 14, metadataY);
      metadataY += 6;
      if (trip.countries?.length) {
        const countryLines = doc.splitTextToSize(
          `Countries: ${trip.countries.join(', ')}`,
          269,
        );
        doc.text(countryLines, 14, metadataY);
        metadataY += countryLines.length * 5;
      }

      let dayCursor = 1;
      const rows = destinations.map((destination, index) => {
        const days = Math.max(1, Number(destination.days || destination.nights) || 1);
        const dayLabel =
          days === 1 ? `Day ${dayCursor}` : `Days ${dayCursor}-${dayCursor + days - 1}`;
        dayCursor += days;
        return [
          String(index + 1),
          destination.country || '—',
          destination.name,
          dayLabel,
          destination.accommodation || '—',
          destination.activities || '—',
          destination.transportation || '—',
        ];
      });

      let pageNumber = 0;
      autoTable(doc, {
        startY: metadataY + 4,
        head: [
          [
            '#',
            'Country',
            'Destination',
            'Days',
            'Accommodation',
            'Activities',
            'Transportation',
          ],
        ],
        body: rows,
        theme: 'striped',
        margin: { left: 14, right: 14, bottom: 15 },
        styles: {
          font: 'helvetica',
          fontSize: 8,
          cellPadding: 2.5,
          overflow: 'linebreak',
        },
        headStyles: { fillColor: orange, textColor: [255, 255, 255], fontStyle: 'bold' },
        bodyStyles: { textColor: ink },
        columnStyles: {
          0: { cellWidth: 9, halign: 'center' },
          1: { cellWidth: 29 },
          2: { cellWidth: 35, fontStyle: 'bold' },
          3: { cellWidth: 20, halign: 'center' },
          4: { cellWidth: 45 },
          5: { cellWidth: 54 },
          6: { cellWidth: 54 },
        },
        didDrawPage: () => {
          pageNumber += 1;
          doc.setFontSize(8);
          doc.setTextColor(130, 116, 104);
          doc.text(
            `LakBye itinerary  ·  Page ${pageNumber}`,
            14,
            doc.internal.pageSize.getHeight() - 7,
          );
        },
      });

      const safeTripName = trip.name
        .trim()
        .replace(/[^a-zA-Z0-9_-]+/g, '_')
        .replace(/^_+|_+$/g, '');
      doc.save(`LakBye_${safeTripName || 'Trip'}_Itinerary.pdf`);
    } catch {
      setExportError('Unable to export the itinerary PDF. Please try again.');
    }
  };

  const totalSpent = budget.expenses.reduce(
    (sum, item) => sum + (Number(item.cost) || 0),
    0,
  );
  const remainingBalance = (trip?.totalBudget || budget.total) - totalSpent;

  return (
    <div
      className="modal-overlay export-pdf-modal-overlay"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="modal-backdrop-dismiss"
        aria-label="Close export preview"
        onClick={onClose}
      />
      <div className="export-itinerary-modal-container">
        {/* Modal Controls Header (Hidden in Print) */}
        <div className="export-modal-header no-print">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg font-bold text-stone-900">
              Export Trip Itinerary (PDF)
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="export-print-btn"
              disabled={loading || !trip}
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="export-close-btn"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Itinerary Document Sheet */}
        <div className="export-itinerary-scrollable">
          {exportError && (
            <p role="alert" className="mx-6 mt-4 text-sm text-rose-700">
              {exportError}
            </p>
          )}
          {loading ? (
            <div className="flex flex-col items-center justify-center p-16 text-stone-500 gap-3">
              <div className="w-8 h-8 border-3 border-amber-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium">Preparing itinerary document...</span>
            </div>
          ) : trip ? (
            <div id="printable-itinerary-sheet" className="printable-sheet">
              {/* Document Header */}
              <div className="printable-header">
                <div className="printable-header-brand">
                  <span className="printable-brand-name">LakBye</span>
                  <span className="printable-brand-tagline">
                    Travel Itinerary & Budget Report
                  </span>
                </div>
                <div className="printable-meta-badge">
                  <span>
                    Generated on{' '}
                    {new Date().toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>

              {/* Trip Title & Summary Banner */}
              <div className="printable-trip-banner">
                <h1 className="printable-trip-title">{trip.name}</h1>
                <div className="printable-trip-meta-row">
                  <div className="printable-meta-item">
                    <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      {formatUserDate(trip.startDate) || 'Flexible'} –{' '}
                      {formatUserDate(trip.endDate) || 'Flexible'}
                      {trip.nights
                        ? ` (${trip.nights} Night${trip.nights > 1 ? 's' : ''})`
                        : ''}
                    </span>
                  </div>
                  {trip.countries && trip.countries.length > 0 && (
                    <div className="printable-meta-item">
                      <MapPin className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>{trip.countries.join(', ')}</span>
                    </div>
                  )}
                  <div className="printable-meta-item">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="capitalize font-medium text-emerald-700">
                      {trip.status || 'Planning'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Destinations & Route Schedule */}
              <div className="printable-section">
                <h3 className="printable-section-title">1. Route & Destinations</h3>
                {destinations.length > 0 ? (
                  <table className="printable-table">
                    <thead>
                      <tr>
                        <th style={{ width: '6%' }}>#</th>
                        <th style={{ width: '24%' }}>Destination</th>
                        <th style={{ width: '10%' }}>Nights</th>
                        <th style={{ width: '20%' }}>Accommodation</th>
                        <th style={{ width: '20%' }}>Activities</th>
                        <th style={{ width: '20%' }}>Transportation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {destinations.map((dest, i) => (
                        <tr key={dest.id || i}>
                          <td className="text-center font-bold text-stone-500">
                            {i + 1}
                          </td>
                          <td className="font-semibold text-stone-800">{dest.name}</td>
                          <td className="text-center">{dest.nights || 1}</td>
                          <td>{dest.accommodation || '—'}</td>
                          <td>{dest.activities || '—'}</td>
                          <td>{dest.transportation || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="printable-empty-note">No stops defined yet.</p>
                )}
              </div>

              {/* Financial & Budget Breakdown */}
              <div className="printable-section">
                <h3 className="printable-section-title">
                  2. Budget & Financial Overview
                </h3>
                <div className="printable-budget-cards-row">
                  <div className="printable-budget-card">
                    <span className="printable-budget-card-label">Total Allocated</span>
                    <span className="printable-budget-card-val">
                      ₱{Number(trip.totalBudget || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="printable-budget-card">
                    <span className="printable-budget-card-label">
                      Total Recorded Expenses
                    </span>
                    <span className="printable-budget-card-val text-red-600">
                      ₱{totalSpent.toLocaleString()}
                    </span>
                  </div>
                  <div className="printable-budget-card">
                    <span className="printable-budget-card-label">Remaining Balance</span>
                    <span
                      className={`printable-budget-card-val ${remainingBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}
                    >
                      ₱{remainingBalance.toLocaleString()}
                    </span>
                  </div>
                </div>

                {budget.expenses.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                      Itemized Expenses
                    </h4>
                    <table className="printable-table">
                      <thead>
                        <tr>
                          <th style={{ width: '50%' }}>Expense Description</th>
                          <th style={{ width: '25%' }}>Category</th>
                          <th style={{ width: '25%' }} className="text-right">
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {budget.expenses.map((exp, idx) => (
                          <tr key={exp.id || idx}>
                            <td className="font-medium text-stone-800">{exp.name}</td>
                            <td className="capitalize text-stone-600">
                              {exp.category || 'General'}
                            </td>
                            <td className="text-right font-semibold text-stone-900">
                              ₱{Number(exp.cost || 0).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="printable-footer">
                <p>LakBye Travel Planning — Designed for seamless adventures.</p>
                <p>Visit lakbye.vercel.app to edit this trip anytime.</p>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-stone-500">
              Trip information could not be loaded.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
