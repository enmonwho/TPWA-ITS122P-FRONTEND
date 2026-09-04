import earthImg from '../assets/earth.png';

export default function Spinner({ size = 40 }: { size?: number }) {
  return (
    <div className="spinner-container" role="status" aria-label="Loading">
      <img
        src={earthImg}
        alt="Loading Earth"
        className="spinner"
        style={{
          width: size,
          height: size,
          objectFit: 'contain',
          background: 'transparent',
        }}
      />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
