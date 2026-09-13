import { useState, useEffect } from 'react';
import GlobeMap from '../components/GlobeMap';
import magnifierIcon from '../assets/magnifier.png';
import { tripsApi } from '../services/api';
import type { Trip } from '../types/trip';

interface PlaceItem {
  id: string;
  name: string;
  address: string;
  type: 'Activities' | 'Eat & Drink' | 'Stays' | 'Destinations';
  description?: string;
  country?: string;
  city?: string;
  notes?: string;
  lat?: number;
  lng?: number;
}

interface CustomList {
  id: string;
  name: string;
  description: string;
  dateRange: string;
  places: PlaceItem[];
}

export default function MapView() {
  const [lists, setLists] = useState<CustomList[]>([]);
  const [activeList, setActiveList] = useState<CustomList | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [isNewListOpen, setIsNewListOpen] = useState(false);
  const [isAddPlaceView, setIsAddPlaceView] = useState(false);
  const [addPlaceMode, setAddPlaceMode] = useState<'search' | 'manual'>('search');
  const [activeCategoryTab, setActiveCategoryTab] = useState('All');
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // New List form
  const [newListName, setNewListName] = useState('');
  const [newListDesc, setNewListDesc] = useState('');

  // Manual Place form
  const [placeName, setPlaceName] = useState('');
  const [placeDesc, setPlaceDesc] = useState('');
  const [placeType, setPlaceType] = useState<PlaceItem['type']>('Activities');
  const [placeAddress, setPlaceAddress] = useState('');
  const [placeCountry, setPlaceCountry] = useState('');
  const [placeCity, setPlaceCity] = useState('');
  const [placeTags, setPlaceTags] = useState('');
  const [placeNotes, setPlaceNotes] = useState('');

  useEffect(() => {
    const fetchLists = async () => {
      try {
        const trips = await tripsApi.getTrips();
        if (trips && trips.length > 0) {
          const mappedLists: CustomList[] = trips.map((t: Trip) => ({
            id: String(t.id),
            name: t.name,
            description: 'Custom travel itinerary list',
            dateRange: `${t.startDate} - ${t.endDate}`,
            places: [],
          }));
          setLists(mappedLists);
        }
      } catch {
        setLists([
          {
            id: 'demo-1',
            name: 'Trip Name',
            description: 'Sample itinerary',
            dateRange: 'Date - Date',
            places: [],
          },
        ]);
      }
    };
    fetchLists();
  }, []);

  const handleCreateList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;

    const newList: CustomList = {
      id: `list-${Date.now()}`,
      name: newListName,
      description: newListDesc || 'My new trip list',
      dateRange: 'Date - Date',
      places: [],
    };

    setLists([...lists, newList]);
    setActiveList(newList);
    setNewListName('');
    setNewListDesc('');
    setIsNewListOpen(false);
  };

  const handleAddManualPlace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!placeName.trim() || !activeList) return;

    const newPlace: PlaceItem = {
      id: `place-${Date.now()}`,
      name: placeName,
      address: placeAddress || `${placeCity}, ${placeCountry}` || 'Location address',
      type: placeType,
      description: placeDesc,
      country: placeCountry,
      city: placeCity,
      notes: placeNotes,
      lat: 35.68 + Math.random() * 0.05,
      lng: 139.69 + Math.random() * 0.05,
    };

    const updatedList = {
      ...activeList,
      places: [...activeList.places, newPlace],
    };

    setActiveList(updatedList);
    setLists(lists.map((l) => (l.id === updatedList.id ? updatedList : l)));

    setPlaceName('');
    setPlaceDesc('');
    setPlaceAddress('');
    setPlaceCountry('');
    setPlaceCity('');
    setPlaceTags('');
    setPlaceNotes('');
    setIsAddPlaceView(false);
  };

  const handleDeletePlace = (placeId: string) => {
    if (!activeList) return;
    const updatedList = {
      ...activeList,
      places: activeList.places.filter((p) => p.id !== placeId),
    };
    setActiveList(updatedList);
    setLists(lists.map((l) => (l.id === updatedList.id ? updatedList : l)));
    setActiveDropdown(null);
  };

  const filteredPlaces = activeList
    ? activeList.places.filter((p) => {
        if (activeCategoryTab === 'All') return true;
        return p.type === activeCategoryTab;
      })
    : [];

  const globeMarkers = activeList
    ? activeList.places
        .filter((p) => p.lat && p.lng)
        .map((p) => ({
          id: p.id,
          lng: p.lng!,
          lat: p.lat!,
          title: `${p.name} (${p.type})`,
        }))
    : [];

  const filteredLists = lists.filter((l) =>
    l.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="map-page-wrapper">
      <div className="map-container-card">
        <div className="map-sidebar-pane">
          <div className="map-sidebar-scroll-content">
            {isAddPlaceView ? (
              <div className="flex flex-col h-full pr-2">
                <div className="flex items-center justify-between mb-4 border-b border-stone-200 pb-3">
                  <button
                    onClick={() => setIsAddPlaceView(false)}
                    className="text-stone-700 text-sm font-semibold flex items-center gap-1"
                  >
                    ‹ Cancel
                  </button>
                  <h3 className="text-base font-bold text-stone-900">Add New Place</h3>
                  <div className="w-12" />
                </div>

                <div className="flex justify-center mb-5">
                  <div className="inline-flex bg-stone-100 p-1 rounded-full border border-stone-200">
                    <button
                      type="button"
                      onClick={() => setAddPlaceMode('search')}
                      className={`px-6 py-1.5 rounded-full text-xs font-semibold transition-all ${
                        addPlaceMode === 'search'
                          ? 'bg-white text-stone-900 shadow-sm border border-stone-200'
                          : 'text-stone-500'
                      }`}
                    >
                      Search
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddPlaceMode('manual')}
                      className={`px-6 py-1.5 rounded-full text-xs font-semibold transition-all ${
                        addPlaceMode === 'manual'
                          ? 'bg-white text-stone-900 shadow-sm border border-stone-200'
                          : 'text-stone-500'
                      }`}
                    >
                      Add Manually
                    </button>
                  </div>
                </div>

                {addPlaceMode === 'search' ? (
                  <div className="flex flex-col gap-4 py-2">
                    <div className="relative">
                      <img
                        src={magnifierIcon}
                        alt=""
                        className="w-4 h-4 opacity-50 absolute left-4 top-1/2 -translate-y-1/2"
                      />
                      <input
                        type="text"
                        className="modal-input-gradient pl-11"
                        placeholder="Add place..."
                        aria-label="Add place"
                      />
                    </div>
                  </div>
                ) : (
                  <form
                    onSubmit={handleAddManualPlace}
                    className="flex flex-col gap-3.5 pb-8"
                  >
                    <div>
                      <label htmlFor="manual-place-name" className="modal-label">
                        NAME
                      </label>
                      <input
                        id="manual-place-name"
                        type="text"
                        required
                        className="modal-input-gradient"
                        placeholder="e.g. McDonalds"
                        value={placeName}
                        onChange={(e) => setPlaceName(e.target.value)}
                      />
                    </div>

                    <div>
                      <label htmlFor="manual-place-description" className="modal-label">
                        DESCRIPTION
                      </label>
                      <textarea
                        id="manual-place-description"
                        className="modal-input-gradient py-2.5 h-20 resize-none"
                        placeholder="Describe this place..."
                        value={placeDesc}
                        onChange={(e) => setPlaceDesc(e.target.value)}
                      />
                    </div>

                    <div>
                      <label htmlFor="manual-place-type" className="modal-label">
                        TYPE
                      </label>
                      <div className="relative">
                        <select
                          id="manual-place-type"
                          className="modal-input-gradient appearance-none pr-10 cursor-pointer"
                          value={placeType}
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                            setPlaceType(e.target.value as PlaceItem['type'])
                          }
                        >
                          <option value="Activities">Activities</option>
                          <option value="Eat & Drink">Eat & Drink</option>
                          <option value="Stays">Stays</option>
                          <option value="Destinations">Destinations</option>
                        </select>
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-stone-700 text-xs">
                          ▼
                        </span>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="manual-place-address" className="modal-label">
                        Address
                      </label>
                      <input
                        id="manual-place-address"
                        type="text"
                        className="modal-input-gradient"
                        placeholder="Enter an address or location"
                        value={placeAddress}
                        onChange={(e) => setPlaceAddress(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="manual-place-country" className="modal-label">
                          Country
                        </label>
                        <input
                          id="manual-place-country"
                          type="text"
                          className="modal-input-gradient"
                          placeholder="e.g. Qatar"
                          value={placeCountry}
                          onChange={(e) => setPlaceCountry(e.target.value)}
                        />
                      </div>
                      <div>
                        <label htmlFor="manual-place-city" className="modal-label">
                          City
                        </label>
                        <input
                          id="manual-place-city"
                          type="text"
                          className="modal-input-gradient"
                          placeholder="e.g. Doha"
                          value={placeCity}
                          onChange={(e) => setPlaceCity(e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="manual-place-tags" className="modal-label">
                        TAGS
                      </label>
                      <div className="relative">
                        <select
                          id="manual-place-tags"
                          className="modal-input-gradient appearance-none pr-10 cursor-pointer"
                          value={placeTags}
                          onChange={(e) => setPlaceTags(e.target.value)}
                        >
                          <option value="" disabled>
                            Add tags...
                          </option>
                          <option value="Must Visit">Must Visit</option>
                          <option value="Budget">Budget</option>
                          <option value="Scenic">Scenic</option>
                        </select>
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-stone-700 text-xs">
                          ▼
                        </span>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="manual-place-notes" className="modal-label">
                        NOTES
                      </label>
                      <textarea
                        id="manual-place-notes"
                        className="modal-input-gradient py-2.5 h-16 resize-none"
                        placeholder="Add notes..."
                        value={placeNotes}
                        onChange={(e) => setPlaceNotes(e.target.value)}
                      />
                    </div>

                    <div className="flex justify-center mt-3">
                      <button type="submit" className="btn-start-planning-modal">
                        Add Place
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              <>
                {!activeList ? (
                  <>
                    <div className="map-search-box">
                      <img src={magnifierIcon} alt="" className="w-5 h-5 opacity-50" />
                      <input
                        type="text"
                        className="w-full bg-transparent outline-none text-sm font-medium text-stone-800 placeholder-stone-400"
                        placeholder="Search..."
                        value={searchQuery}
                        aria-label="Search lists"
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-1 mt-2">
                      {filteredLists.map((list) => (
                        <button
                          type="button"
                          key={list.id}
                          className="map-list-item-row text-left w-full"
                          onClick={() => setActiveList(list)}
                        >
                          <div className="map-list-item-title">
                            <span>{list.name}</span>
                            <span className="text-stone-400 text-sm font-normal">›</span>
                          </div>
                          <div>
                            <span className="map-list-date-badge">{list.dateRange}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setActiveList(null)}
                          className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-700 font-bold hover:bg-stone-200"
                        >
                          ‹
                        </button>
                        <div>
                          <h2 className="text-xl font-bold text-stone-900">
                            {activeList.name}
                          </h2>
                          <span className="map-list-date-badge mt-0.5">
                            {activeList.dateRange}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setIsAddPlaceView(true)}
                        className="btn-lakbye-gradient text-xs py-2 px-4"
                      >
                        + Add Place
                      </button>
                    </div>

                    <div className="map-category-tabs">
                      {['All', 'Activities', 'Eat & Drink', 'Stays', 'Destinations'].map(
                        (tab) => {
                          const count =
                            tab === 'All'
                              ? activeList.places.length
                              : activeList.places.filter((p) => p.type === tab).length;
                          return (
                            <button
                              key={tab}
                              onClick={() => setActiveCategoryTab(tab)}
                              className={`map-tab-pill ${activeCategoryTab === tab ? 'active' : ''}`}
                            >
                              {tab} {count}
                            </button>
                          );
                        },
                      )}
                    </div>

                    {filteredPlaces.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-12 text-center my-4">
                        <p className="font-bold text-stone-800 mb-1">
                          No places in this category yet
                        </p>
                        <p className="text-xs text-stone-500 mb-0">
                          Add your first place!
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {filteredPlaces.map((place) => {
                          const badgeClass =
                            place.type === 'Eat & Drink'
                              ? 'badge-eat-drink'
                              : place.type === 'Activities'
                                ? 'badge-activities'
                                : place.type === 'Stays'
                                  ? 'badge-stays'
                                  : 'badge-destinations';

                          return (
                            <div key={place.id} className="map-place-card">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="font-bold text-stone-900 text-base">
                                    {place.name}
                                  </h4>
                                  <p className="text-xs text-stone-500 mt-0.5">
                                    {place.address}
                                  </p>
                                </div>
                                <div className="relative">
                                  <button
                                    onClick={() =>
                                      setActiveDropdown(
                                        activeDropdown === place.id ? null : place.id,
                                      )
                                    }
                                    className="text-stone-400 hover:text-stone-700 font-bold text-lg px-2"
                                  >
                                    ⋮
                                  </button>
                                  {activeDropdown === place.id && (
                                    <div className="place-actions-menu">
                                      <button
                                        onClick={() => handleDeletePlace(place.id)}
                                        className="delete-btn"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div>
                                <span className={`place-badge ${badgeClass}`}>
                                  {place.type}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {!activeList && !isAddPlaceView && (
            <button onClick={() => setIsNewListOpen(true)} className="map-new-list-btn">
              <span className="text-lg font-bold leading-none">+</span>
              <span>New List</span>
            </button>
          )}
        </div>

        <div className="map-globe-view-panel">
          <GlobeMap markers={globeMarkers} />
        </div>
      </div>

      {isNewListOpen && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-list-modal-title"
        >
          <button
            type="button"
            className="modal-backdrop-dismiss"
            aria-label="Close modal"
            onClick={() => setIsNewListOpen(false)}
          />
          <div className="start-trip-modal-card">
            <button
              type="button"
              onClick={() => setIsNewListOpen(false)}
              className="absolute top-5 right-6 text-lg font-bold"
              aria-label="Close modal"
            >
              ✕
            </button>
            <h3
              id="create-list-modal-title"
              className="text-lg font-bold text-stone-900 mb-4"
            >
              Create a New List
            </h3>
            <form onSubmit={handleCreateList} className="flex flex-col gap-4">
              <div>
                <label htmlFor="new-list-name-input" className="modal-label">
                  List Name
                </label>
                <input
                  id="new-list-name-input"
                  type="text"
                  required
                  className="modal-input-gradient"
                  placeholder="List Name"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="new-list-desc-input" className="modal-label">
                  Description
                </label>
                <textarea
                  id="new-list-desc-input"
                  className="modal-input-gradient py-2.5 h-24 resize-none"
                  placeholder="Add description..."
                  value={newListDesc}
                  onChange={(e) => setNewListDesc(e.target.value)}
                />
              </div>
              <div className="flex justify-center mt-3">
                <button type="submit" className="btn-start-planning-modal">
                  Create List
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
