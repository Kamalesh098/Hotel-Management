import { useEffect, useState } from "react";
import { Routes, Route, Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Helmet } from "react-helmet-async";
import { fetchHotels } from "./store";
import api, { imageUrl } from "./api";

const LIMIT = 5;

function HotelForm({ hotel, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: hotel?.title || "", description: hotel?.description || "",
    latitude: hotel?.latitude ?? "", longitude: hotel?.longitude ?? "",
    price: hotel?.price ?? ""
  });
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(hotel ? imageUrl(hotel.image) : "");
  const [error, setError] = useState("");

  function change(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }
  function chooseImage(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Choose an image file.");
    if (file.size > 5 * 1024 * 1024) return setError("Image must be below 5 MB.");
    setImage(file);
    setPreview(URL.createObjectURL(file));
    setError("");
  }
  async function submit(e) {
    e.preventDefault();
    if (!hotel && !image) return setError("Please upload a hotel image.");
    if (Number(form.latitude) < -90 || Number(form.latitude) > 90) return setError("Latitude must be between -90 and 90.");
    if (Number(form.longitude) < -180 || Number(form.longitude) > 180) return setError("Longitude must be between -180 and 180.");
    if (Number(form.price) < 0 || form.price === "") return setError("Enter a valid price.");
    const data = new FormData();
    Object.entries(form).forEach(([key, value]) => data.append(key, value));
    if (image) data.append("image", image);
    try {
      if (hotel) await api.put(`/hotels/${hotel.id}`, data);
      else await api.post("/hotels", data);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || "Could not save hotel.");
    }
  }

  return <div className="modal-backdrop"><form className="form modal" onSubmit={submit}>
    <div className="form-head"><h2>{hotel ? "Edit Hotel" : "Add New Hotel"}</h2><button type="button" className="close" onClick={onClose}>×</button></div>
    <label>Hotel Image *</label><input type="file" accept="image/*" onChange={chooseImage} />
    {preview && <img className="preview" src={preview} alt="Hotel preview" />}
    <label>Hotel Name *</label><input name="title" value={form.title} onChange={change} maxLength="150" required placeholder="Enter hotel name" />
    <label>Description *</label><textarea name="description" value={form.description} onChange={change} required rows="3" placeholder="Enter description" />
    <div className="two-cols">
      <div><label>Latitude *</label><input type="number" name="latitude" min="-90" max="90" step="any" value={form.latitude} onChange={change} required /></div>
      <div><label>Longitude *</label><input type="number" name="longitude" min="-180" max="180" step="any" value={form.longitude} onChange={change} required /></div>
    </div>
    <label>Price (₹) *</label><input type="number" name="price" min="0" step="0.01" value={form.price} onChange={change} required />
    {error && <p className="error">{error}</p>}
    <button className="primary" type="submit">{hotel ? "Update Hotel" : "Save Hotel"}</button>
  </form></div>;
}

function Pagination({ page, totalPages, onPage }) {
  return <div className="pagination">
    <button disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
    <span>Page {page} of {Math.max(totalPages, 1)}</span>
    <button disabled={page >= totalPages} onClick={() => onPage(page + 1)}>Next</button>
  </div>;
}

function HotelCard({ hotel, onEdit, onDelete }) {
  return <article className="hotel-card">
    <Link to={`/hotels/${hotel.id}`} className="hotel-image-link">
      <img src={imageUrl(hotel.image)} alt={`${hotel.title} hotel`} />
    </Link>
    <div className="hotel-info">
      <Link to={`/hotels/${hotel.id}`} className="hotel-title"><h3>{hotel.title}</h3></Link>
      <p>{hotel.description.length > 120 ? `${hotel.description.slice(0, 120)}...` : hotel.description}</p>
      <strong className="price">₹{Number(hotel.price).toLocaleString("en-IN")}</strong>
      <div className="actions">
        <button className="edit" onClick={() => onEdit(hotel)}>Edit</button>
        <button className="delete" onClick={() => onDelete(hotel.id)}>Delete</button>
        <Link className="details-link" to={`/hotels/${hotel.id}`}>View details →</Link>
      </div>
    </div>
  </article>;
}

function Home() {
  const dispatch = useDispatch();
  const { items, total, loading, error } = useSelector((state) => state.hotels);
  const [search, setSearch] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [notice, setNotice] = useState("");

  const load = () => dispatch(fetchHotels({ search, minPrice, maxPrice, page, limit: LIMIT }));
  useEffect(() => { load(); }, [dispatch, search, minPrice, maxPrice, page]);

  async function deleteHotel(id) {
    if (!window.confirm("Are you sure you want to delete this hotel?")) return;
    try {
      await api.delete(`/hotels/${id}`);
      setNotice("Hotel deleted successfully!");
      load();
    } catch { setNotice("Unable to delete hotel."); }
  }
  function saved() {
    setShowForm(false); setEditing(null); setNotice("Hotel saved successfully!"); load();
  }

  return <main className="container">
    <Helmet><title>Hotel List | Hotel Finder</title><meta name="description" content="Search and explore hotels." /></Helmet>
    <div className="page-heading"><div><p className="eyebrow">FIND YOUR STAY</p><h1>Available Hotels</h1><p className="muted">Explore and manage hotel details</p></div>
      <button className="primary add-btn" onClick={() => { setEditing(null); setShowForm(true); }}>+ Add Hotel</button>
    </div>
    <section className="filters">
      <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search hotel by name..." />
      <input type="number" min="0" value={minPrice} onChange={(e) => { setMinPrice(e.target.value); setPage(1); }} placeholder="Minimum price" />
      <input type="number" min="0" value={maxPrice} onChange={(e) => { setMaxPrice(e.target.value); setPage(1); }} placeholder="Maximum price" />
      <button className="secondary" onClick={() => { setSearch(""); setMinPrice(""); setMaxPrice(""); setPage(1); }}>Clear</button>
    </section>
    {notice && <div className="notice">{notice}<button onClick={() => setNotice("")}>×</button></div>}
    {loading && <p>Loading hotels...</p>}
    {error && <p className="error">{error}</p>}
    {!loading && !error && items.length === 0 && <div className="empty">No hotels found. Add your first hotel!</div>}
    <section className="hotel-list">{items.map((hotel) => <HotelCard key={hotel.id} hotel={hotel}
      onEdit={(item) => { setEditing(item); setShowForm(true); }} onDelete={deleteHotel} />)}</section>
    <Pagination page={page} totalPages={Math.ceil(total / LIMIT)} onPage={setPage} />
    {showForm && <HotelForm hotel={editing} onClose={() => setShowForm(false)} onSaved={saved} />}
  </main>;
}

function HotelDetails() {
  const { id } = useParams();
  const [hotel, setHotel] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api.get(`/hotels/${id}`).then((res) => setHotel(res.data))
      .catch(() => setError("Hotel not found."));
  }, [id]);

  if (error) return <main className="container"><p className="error">{error}</p><Link to="/">Back to hotels</Link></main>;
  if (!hotel) return <main className="container">Loading hotel...</main>;

  const lat = Number(hotel.latitude);
  const lon = Number(hotel.longitude);
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.01}%2C${lat - 0.01}%2C${lon + 0.01}%2C${lat + 0.01}&layer=mapnik&marker=${lat}%2C${lon}`;

  return <main className="container detail-page">
    <Helmet><title>{hotel.title} | Hotel Finder</title><meta name="description" content={hotel.description.slice(0, 155)} /></Helmet>
    <Link to="/" className="back-link">← Back to hotels</Link>
    <img className="detail-image" src={imageUrl(hotel.image)} alt={`${hotel.title} hotel`} />
    <h1>{hotel.title}</h1><p className="detail-price">₹{Number(hotel.price).toLocaleString("en-IN")}</p>
    <p className="full-description">{hotel.description}</p>
    <h2>Hotel Location</h2>
    <p>Latitude: {lat} | Longitude: {lon}</p>
    <iframe title={`Map showing ${hotel.title} location`} className="map" src={mapUrl} loading="lazy" />
    <p className="muted small">Map marker uses the latitude and longitude saved for this hotel.</p>
  </main>;
}

export default function App() {
  return <><header className="topbar"><Link to="/" className="brand">Stay<span>Finder</span></Link><span>Hotel Management</span></header>
    <Routes><Route path="/" element={<Home />} /><Route path="/hotels/:id" element={<HotelDetails />} /><Route path="*" element={<main className="container"><h2>Page not found</h2><Link to="/">Go home</Link></main>} /></Routes>
    <footer>© 2026 StayFinder · Hotel Management</footer></>;
}
