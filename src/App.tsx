import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  apiRequest,
  apiRequestBlob,
  ApiError,
  jsonBody,
} from "./api";
import type { Book, Category, Loan, Member, OverdueItem, Page, ReportRow, Role } from "./api";

type Section = "books" | "members" | "loans" | "overdue" | "report" | "users";

interface Session {
  token: string;
  role: Role;
  username: string;
}

const navItems: Array<{ id: Section; label: string; icon: string; admin?: boolean }> = [
  { id: "books", label: "Catálogo", icon: "▤" },
  { id: "members", label: "Socios", icon: "♙" },
  { id: "loans", label: "Préstamos", icon: "⇄" },
  { id: "overdue", label: "Vencidos", icon: "◷" },
  { id: "report", label: "Más prestados", icon: "▥", admin: true },
  { id: "users", label: "Bibliotecarios", icon: "♧", admin: true },
];

function useApiError() {
  const [error, setError] = useState("");
  const run = useCallback(async <T,>(action: () => Promise<T>): Promise<T | undefined> => {
    setError("");
    try {
      return await action();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Ocurrió un error inesperado.");
      return undefined;
    }
  }, []);
  return { error, setError, run };
}

export default function App() {
  const [session, setSession] = useState<Session | null>(() => {
    const saved = sessionStorage.getItem("manager-library-session");
    return saved ? (JSON.parse(saved) as Session) : null;
  });
  const [section, setSection] = useState<Section>("books");
  const [notice, setNotice] = useState("");

  const logout = () => {
    sessionStorage.removeItem("manager-library-session");
    setSession(null);
    setNotice("");
  };

  if (!session) {
    return <Login onLogin={(value) => {
      sessionStorage.setItem("manager-library-session", JSON.stringify(value));
      setSession(value);
    }} />;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); setSection("books"); }}>
          <span className="brand-mark">M</span>
          <span><strong>Manager</strong><small>LIBRARY</small></span>
        </a>
        <div className="nav-caption">BIBLIOTECA</div>
        <nav aria-label="Navegación principal">
          {navItems.filter((item) => !item.admin || session.role === "admin").map((item) => (
            <button
              className={`nav-item ${section === item.id ? "active" : ""}`}
              key={item.id}
              onClick={() => { setSection(item.id); setNotice(""); }}
            >
              <span aria-hidden="true">{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="user-avatar">{session.username.slice(0, 1).toUpperCase()}</div>
          <div className="user-copy"><strong>{session.username}</strong><small>{session.role === "admin" ? "Administrador" : "Bibliotecario"}</small></div>
          <button className="icon-button logout-button" title="Cerrar sesión" aria-label="Cerrar sesión" onClick={logout}>↪</button>
        </div>
      </aside>
      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">Manager Library <span>/</span> <strong>{navItems.find((item) => item.id === section)?.label}</strong></div>
          <div className="status-pill"><span /> Sesión activa</div>
        </header>
        {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice("")}>×</button></div>}
        {section === "books" && <Books token={session.token} isAdmin={session.role === "admin"} notify={setNotice} />}
        {section === "members" && <Members token={session.token} notify={setNotice} />}
        {section === "loans" && <Loans token={session.token} notify={setNotice} />}
        {section === "overdue" && <Overdue token={session.token} />}
        {section === "report" && <Report token={session.token} />}
        {section === "users" && <Librarians token={session.token} notify={setNotice} />}
      </main>
    </div>
  );
}

function Login({ onLogin }: { onLogin: (session: Session) => void }) {
  const { error, run } = useApiError();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const result = await run(() => apiRequest<{ access_token: string; role: Role }>("/auth/login", undefined, {
      method: "POST",
      body: jsonBody({ username, password }),
    }));
    setBusy(false);
    if (result) onLogin({ token: result.access_token, role: result.role, username: username.trim().toLowerCase() });
  };

  return (
    <main className="login-screen">
      <section className="login-card">
        <div className="brand login-brand"><span className="brand-mark">M</span><span><strong>Manager</strong><small>LIBRARY</small></span></div>
        <p className="eyebrow">GESTIÓN BIBLIOTECARIA</p>
        <h1>Bienvenido de nuevo</h1>
        <p className="muted">Inicie sesión para administrar la biblioteca.</p>
        {error && <div className="error-banner" role="alert">{error}</div>}
        <form onSubmit={submit} className="form-stack">
          <label>Usuario<input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required /></label>
          <label>Contraseña<input autoComplete="current-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          <button className="primary-button full-width" disabled={busy}>{busy ? "Ingresando…" : "Iniciar sesión"} <span>→</span></button>
        </form>
        <p className="login-footnote">Acceso exclusivo para el equipo de biblioteca.</p>
      </section>
      <div className="login-decoration"><div className="decoration-circle" /><div className="decoration-copy"><span>LECTURA · CONOCIMIENTO · COMUNIDAD</span><h2>Una biblioteca<br />para todos.</h2></div></div>
    </main>
  );
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="muted">{description}</p></div>{action}</div>;
}

function ErrorMessage({ error }: { error: string }) {
  return error ? <div className="error-banner" role="alert">{error}</div> : null;
}

function BookCover({ book, token }: { book: Book; token: string }) {
  const [source, setSource] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objectUrl: string | undefined;
    let active = true;
    setSource("");
    setFailed(false);
    void apiRequestBlob(`/books/${book.id}/cover`, token)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        if (active) setSource(objectUrl);
        else URL.revokeObjectURL(objectUrl);
      })
      .catch(() => {
        if (active) setFailed(true);
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [book.id, token]);

  return source
    ? <img src={source} alt={`Portada de ${book.title}`} />
    : <span>{failed ? "PORTADA NO DISPONIBLE" : "CARGANDO…"}</span>;
}

function Pagination({ page, size, total, onChange }: { page: number; size: number; total: number; onChange: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / size));
  if (pages <= 1) return null;

  return (
    <nav className="pagination" aria-label="Paginación">
      <button className="secondary-button" disabled={page <= 1} onClick={() => onChange(page - 1)}>Anterior</button>
      <span>Página {page} de {pages} · {total} registros</span>
      <button className="secondary-button" disabled={page >= pages} onClick={() => onChange(page + 1)}>Siguiente</button>
    </nav>
  );
}

function Books({ token, isAdmin, notify }: { token: string; isAdmin: boolean; notify: (message: string) => void }) {
  const { error, run } = useApiError();
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Book | null>(null);
  const [showForm, setShowForm] = useState(false);
  const pageSize = 20;

  const refresh = useCallback(async () => {
    const [bookPage, categoryList] = await Promise.all([
      run(() => apiRequest<Page<Book>>(`/books?q=${encodeURIComponent(query)}&category_id=${encodeURIComponent(category)}&page=${page}&size=${pageSize}`, token)),
      run(() => apiRequest<Category[]>("/categories", token)),
    ]);
    if (bookPage) {
      const lastPage = Math.max(1, Math.ceil(bookPage.total / bookPage.size));
      if (page > lastPage) {
        setPage(lastPage);
        return;
      }
      setBooks(bookPage.items);
      setTotal(bookPage.total);
    }
    if (categoryList) setCategories(categoryList);
  }, [category, page, pageSize, query, run, token]);
  useEffect(() => { void refresh(); }, [refresh]);

  const saveBook = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const wasEditing = selected !== null;
    const form = new FormData(event.currentTarget);
    const data = {
      title: String(form.get("title") || ""),
      author: String(form.get("author") || ""),
      isbn: String(form.get("isbn") || ""),
      category_id: String(form.get("category_id") || ""),
      total_copies: Number(form.get("total_copies")),
    };
    const result = await run(() => apiRequest<Book>(selected ? `/books/${selected.id}` : "/books", token, {
      method: selected ? "PUT" : "POST",
      body: jsonBody(selected ? { ...data, isbn: undefined } : data),
    }));
    if (result) {
      setSelected(null);
      setShowForm(false);
      notify(wasEditing ? "Libro actualizado." : "Libro agregado al catálogo.");
      if (!wasEditing && page > 1) setPage(1);
      else await refresh();
    }
  };

  const deleteBook = async (book: Book) => {
    if (!window.confirm(`¿Dar de baja «${book.title}»?`)) return;
    const result = await run(async () => {
      await apiRequest<void>(`/books/${book.id}`, token, { method: "DELETE" });
      return true;
    });
    if (result) {
      notify("Libro dado de baja.");
      await refresh();
    }
  };

  const uploadCover = async (book: Book, file: File | undefined) => {
    if (!file) return;
    const body = new FormData();
    body.append("file", file);
    const updated = await run(() => apiRequest<Book>(`/books/${book.id}/cover`, token, { method: "PUT", body }));
    if (updated) {
      notify("Portada actualizada.");
      await refresh();
    }
  };

  const deleteCover = async (book: Book) => {
    if (!window.confirm(`¿Quitar la portada de «${book.title}»?`)) return;
    const result = await run(async () => {
      await apiRequest<void>(`/books/${book.id}/cover`, token, { method: "DELETE" });
      return true;
    });
    if (result) {
      notify("Portada eliminada.");
      await refresh();
    }
  };

  return (
    <section>
      <PageHeading eyebrow="COLECCIÓN" title="Catálogo de libros" description="Explore y administre los títulos de la biblioteca."
        action={isAdmin ? <button className="primary-button" onClick={() => { setSelected(null); setShowForm(true); }}>＋ Agregar libro</button> : undefined} />
      <ErrorMessage error={error} />
      <div className="toolbar">
        <label className="search-field"><span>⌕</span><input placeholder="Buscar título o autor…" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} /></label>
        <select aria-label="Filtrar por categoría" value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }}>
          <option value="">Todas las categorías</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <span className="result-count">{total} títulos</span>
      </div>
      {showForm && isAdmin && <BookForm categories={categories} initial={selected} onCancel={() => { setShowForm(false); setSelected(null); }} onSubmit={saveBook} />}
      <div className="book-grid">
        {books.map((book) => (
          <article className="book-card" key={book.id}>
            <div className="book-cover">
              {book.cover_key ? <BookCover book={book} token={token} /> : <span>LIBRO</span>}
              {book.available_copies === 0 && <span className="cover-badge">Prestado</span>}
            </div>
            <div className="book-info"><span className="category-label">{book.category.name}</span><h2>{book.title}</h2><p>{book.author}</p><small>ISBN {book.isbn} · {book.available_copies}/{book.total_copies} disponibles</small></div>
            {isAdmin && <div className="card-actions">
              <button className="text-button" onClick={() => { setSelected(book); setShowForm(true); }}>Editar</button>
              <label className="text-button upload-button">Portada<input type="file" accept="image/jpeg,image/png" onChange={(event) => { void uploadCover(book, event.target.files?.[0]); event.currentTarget.value = ""; }} /></label>
              {book.cover_key && <button className="text-button" onClick={() => void deleteCover(book)}>Quitar portada</button>}
              <button className="text-button danger-text" onClick={() => void deleteBook(book)}>Dar de baja</button>
            </div>}
          </article>
        ))}
        {!books.length && <div className="empty-state">No se encontraron libros. Ajuste la búsqueda o agregue un título.</div>}
      </div>
      <Pagination page={page} size={pageSize} total={total} onChange={setPage} />
    </section>
  );
}

function BookForm({ categories, initial, onCancel, onSubmit }: { categories: Category[]; initial: Book | null; onCancel: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <form className="panel inline-form" onSubmit={onSubmit}>
      <div className="panel-heading"><h2>{initial ? "Editar libro" : "Nuevo libro"}</h2><button className="icon-button" type="button" onClick={onCancel}>×</button></div>
      <div className="form-grid">
        <label>Título<input name="title" defaultValue={initial?.title} required maxLength={250} /></label>
        <label>Autor<input name="author" defaultValue={initial?.author} required maxLength={200} /></label>
        {!initial && <label>ISBN (13 dígitos)<input name="isbn" inputMode="numeric" pattern="[0-9]{13}" required /></label>}
        <label>Categoría<select name="category_id" defaultValue={initial?.category.id} required><option value="">Seleccione…</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>Total de ejemplares<input name="total_copies" type="number" min="1" defaultValue={initial?.total_copies ?? 1} required /></label>
      </div>
      {initial && <p className="muted small-note">El ISBN se conserva; el ajuste de existencias respeta los ejemplares actualmente prestados.</p>}
      <div className="form-actions"><button type="button" className="secondary-button" onClick={onCancel}>Cancelar</button><button className="primary-button">{initial ? "Guardar cambios" : "Crear libro"}</button></div>
    </form>
  );
}

function Members({ token, notify }: { token: string; notify: (message: string) => void }) {
  const { error, run } = useApiError();
  const [members, setMembers] = useState<Member[]>([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;
  const refresh = useCallback(async () => {
    const result = await run(() => apiRequest<Page<Member>>(`/members?q=${encodeURIComponent(query)}&page=${page}&size=${pageSize}`, token));
    if (result) {
      const lastPage = Math.max(1, Math.ceil(result.total / result.size));
      if (page > lastPage) {
        setPage(lastPage);
        return;
      }
      setMembers(result.items);
      setTotal(result.total);
    }
  }, [page, pageSize, query, run, token]);
  useEffect(() => { void refresh(); }, [refresh]);

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const result = await run(() => apiRequest<Member>("/members", token, { method: "POST", body: jsonBody({
      full_name: form.get("full_name"),
      document_number: form.get("document_number"),
    }) }));
    if (result) {
      formElement.reset();
      notify("Socio registrado.");
      if (page > 1) setPage(1);
      else await refresh();
    }
  };

  return (
    <section>
      <PageHeading eyebrow="COMUNIDAD" title="Socios" description="Consulte los socios y registre nuevos miembros." />
      <ErrorMessage error={error} />
      <form className="panel compact-form" onSubmit={create}>
        <div className="panel-heading"><div><h2>Registrar socio</h2><p className="muted">El documento debe ser único.</p></div></div>
        <div className="form-grid"><label>Nombre completo<input name="full_name" required maxLength={200} /></label><label>Número de documento<input name="document_number" required maxLength={30} /></label></div>
        <div className="form-actions"><button className="primary-button">Guardar socio</button></div>
      </form>
      <div className="toolbar"><label className="search-field"><span>⌕</span><input placeholder="Buscar por nombre o documento…" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} /></label><span className="result-count">{total} socios</span></div>
      <div className="table-wrap"><table><thead><tr><th>Nombre</th><th>Documento</th><th>Libros sin devolver</th></tr></thead><tbody>
        {members.map((member) => <tr key={member.id}><td><strong>{member.full_name}</strong></td><td>{member.document_number}</td><td>{member.active_loans ?? "—"}</td></tr>)}
      </tbody></table>{!members.length && <div className="empty-state">Todavía no hay socios registrados.</div>}</div>
      <Pagination page={page} size={pageSize} total={total} onChange={setPage} />
    </section>
  );
}

function Loans({ token, notify }: { token: string; notify: (message: string) => void }) {
  const { error, run } = useApiError();
  const [members, setMembers] = useState<Member[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);

  const refresh = useCallback(async () => {
    const [memberPage, bookPage, loanPage] = await Promise.all([
      run(() => apiRequest<Page<Member>>("/members?size=50", token)),
      run(() => apiRequest<Page<Book>>("/books?size=50", token)),
      run(() => apiRequest<Page<Loan>>("/loans?size=50", token)),
    ]);
    if (memberPage) setMembers(memberPage.items);
    if (bookPage) setBooks(bookPage.items);
    if (loanPage) setLoans(loanPage.items);
  }, [run, token]);
  useEffect(() => { void refresh(); }, [refresh]);

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const ids = form.getAll("book_id").map(String);
    if (ids.length === 0) return;
    const result = await run(() => apiRequest<Loan>("/loans", token, {
      method: "POST",
      body: jsonBody({ member_id: form.get("member_id"), items: ids.map((book_id) => ({ book_id })) }),
    }));
    if (result) {
      formElement.reset();
      notify("Préstamo registrado por 14 días.");
      await refresh();
    }
  };

  const returnBook = async (loan: Loan, itemId: string) => {
    const result = await run(() => apiRequest(`/loans/${loan.id}/items/${itemId}/return`, token, { method: "POST" }));
    if (result !== undefined) {
      notify("Devolución registrada.");
      await refresh();
    }
  };

  return (
    <section>
      <PageHeading eyebrow="CIRCULACIÓN" title="Préstamos" description="Registre préstamos y devuelva cada libro por separado." />
      <ErrorMessage error={error} />
      <form className="panel compact-form" onSubmit={create}>
        <div className="panel-heading"><div><h2>Nuevo préstamo</h2><p className="muted">Seleccione un socio y de 1 a 3 libros disponibles.</p></div></div>
        <div className="form-grid"><label>Socio<select name="member_id" required defaultValue=""><option value="">Seleccione socio…</option>{members.map((member) => <option key={member.id} value={member.id}>{member.full_name} · {member.document_number}</option>)}</select></label>
          <fieldset className="book-picker"><legend>Libros disponibles (máximo 3)</legend>{books.filter((book) => book.available_copies > 0).map((book) => <label className="check-row" key={book.id}><input type="checkbox" name="book_id" value={book.id} /><span>{book.title} <small>({book.available_copies} disponibles)</small></span></label>)}</fieldset>
        </div>
        <div className="form-actions"><button className="primary-button">Registrar préstamo</button></div>
      </form>
      <div className="section-title"><h2>Actividad reciente</h2></div>
      <div className="loan-list">{loans.map((loan) => <article className="panel loan-card" key={loan.id}>
        <div className="loan-header"><div><strong>{loan.member_name}</strong><small>Registrado el {new Date(loan.loaned_at).toLocaleDateString("es-CO")}</small></div><Status status={loan.status} /></div>
        <div className="loan-items">{loan.items.map((item) => <div className="loan-item" key={item.id}><div><strong>{item.book_title}</strong><small>Vence {new Date(item.due_at).toLocaleDateString("es-CO")}</small></div>
          {item.returned_at ? <span className="returned-label">Devuelto</span> : <button className="secondary-button small-button" onClick={() => void returnBook(loan, item.id)}>Registrar devolución</button>}</div>)}</div>
      </article>)}
        {!loans.length && <div className="empty-state">No hay préstamos registrados todavía.</div>}
      </div>
    </section>
  );
}

function Status({ status }: { status: Loan["status"] }) {
  const labels = { open: "Activo", overdue: "Vencido", closed: "Cerrado" };
  return <span className={`status-badge ${status}`}>{labels[status]}</span>;
}

function Overdue({ token }: { token: string }) {
  const { error, run } = useApiError();
  const [items, setItems] = useState<OverdueItem[]>([]);
  useEffect(() => {
    void run(async () => {
      const result = await apiRequest<{ items: OverdueItem[] }>("/loans/overdue", token);
      setItems(result.items);
      return result;
    });
  }, [run, token]);
  return <section><PageHeading eyebrow="SEGUIMIENTO" title="Libros vencidos" description="Préstamos pendientes que superaron su fecha de devolución." /><ErrorMessage error={error} />
    <div className="table-wrap"><table><thead><tr><th>Libro</th><th>Socio</th><th>Fecha de vencimiento</th><th>Retraso</th></tr></thead><tbody>
      {items.map((item) => <tr key={item.item_id}><td><strong>{item.book_title}</strong></td><td>{item.member_name}</td><td>{new Date(item.due_at).toLocaleDateString("es-CO")}</td><td><span className="late-label">{item.days_late} días</span></td></tr>)}
    </tbody></table>{!items.length && !error && <div className="empty-state">¡Todo al día! No hay libros vencidos.</div>}</div>
  </section>;
}

function Report({ token }: { token: string }) {
  const { error, run } = useApiError();
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(`${today.slice(0, 7)}-01`);
  const [to, setTo] = useState(today);
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const total = useMemo(() => rows.reduce((sum, row) => sum + row.times_borrowed, 0), [rows]);
  const search = async (event: FormEvent) => {
    event.preventDefault();
    const result = await run(() => apiRequest<{ rows: ReportRow[] }>(`/reports/most-borrowed?from=${from}&to=${to}`, token));
    if (result) { setRows(result.rows); setLoaded(true); }
  };
  return <section><PageHeading eyebrow="ANÁLISIS" title="Libros más prestados" description="Popularidad de los títulos en el periodo seleccionado." /><ErrorMessage error={error} />
    <form className="panel report-filter" onSubmit={search}><label>Desde<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} required /></label><label>Hasta<input type="date" value={to} onChange={(event) => setTo(event.target.value)} required /></label><button className="primary-button">Ver reporte</button></form>
    {loaded && <><div className="stat-strip"><div><span>Préstamos en el periodo</span><strong>{total}</strong></div><div><span>Títulos destacados</span><strong>{rows.length}</strong></div></div>
      <div className="table-wrap"><table><thead><tr><th>#</th><th>Título</th><th>Categoría</th><th>Veces prestado</th></tr></thead><tbody>{rows.map((row, index) => <tr key={`${row.book_id}-${row.category_name}`}><td>{index + 1}</td><td><strong>{row.book_title}</strong></td><td>{row.category_name}</td><td>{row.times_borrowed}</td></tr>)}</tbody></table>{!rows.length && <div className="empty-state">No hay préstamos en ese periodo.</div>}</div>
    </>}
  </section>;
}

function Librarians({ token, notify }: { token: string; notify: (message: string) => void }) {
  const { error, run } = useApiError();
  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const result = await run(() => apiRequest("/users", token, { method: "POST", body: jsonBody({
      username: form.get("username"),
      password: form.get("password"),
      role: "librarian",
    }) }));
    if (result) {
      formElement.reset();
      notify("Bibliotecario creado.");
    }
  };
  return <section><PageHeading eyebrow="EQUIPO" title="Bibliotecarios" description="Cree cuentas para el personal que registra préstamos y devoluciones." /><ErrorMessage error={error} />
    <form className="panel compact-form" onSubmit={create}><div className="panel-heading"><h2>Crear bibliotecario</h2></div>
      <div className="form-grid"><label>Nombre de usuario<input name="username" autoComplete="off" required maxLength={120} /></label><label>Contraseña<input name="password" type="password" autoComplete="new-password" required /></label></div>
      <p className="muted small-note">El backend aplica hash a la contraseña. Esta no se muestra ni se vuelve a consultar.</p>
      <div className="form-actions"><button className="primary-button">Crear cuenta</button></div>
    </form>
  </section>;
}
