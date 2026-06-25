import { Link } from 'react-router-dom';
export default function NotFound() {
  return (
    <section className="section" style={{ padding: '5rem 0' }}>
      <div className="container narrow center">
        <h1 className="big-404">404</h1>
        <p className="lead">The page you're looking for doesn't exist.</p>
        <Link to="/" className="btn btn-primary">Back home</Link>
      </div>
    </section>
  );
}
