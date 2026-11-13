/*
 * Bộ nối Supabase cho trang kiểm kê.
 * Giả lập đúng phần nhỏ của "db" mà trang dùng khi chạy trong Claude:
 *   db.collection(col).onSnapshot(next, error)   -> nhận thay đổi theo thời gian thực
 *   db.doc("col/id").set(data) / .delete()
 * Mọi tài liệu nằm trong một bảng: public.kiemke_docs (col, id, data jsonb) — xem supabase/schema.sql.
 */
(function () {
  const TABLE = 'kiemke_docs';

  window.makeSupabaseDb = function () {
    const cfg = window.KIEMKE_SUPABASE || {};
    if (!cfg.url || !cfg.anonKey || !window.supabase || !window.supabase.createClient) return null;
    const sb = window.supabase.createClient(cfg.url, cfg.anonKey, { auth: { persistSession: false } });

    const subs = {};          // col -> [{next, error}]
    let started = false, subscribedOnce = false, loading = null;
    const meta = { fromCache: false, hasPendingWrites: false };
    const mk = (id, data) => ({ id: String(id), exists: data != null, data: () => data || undefined, metadata: meta });
    let loadedOnce = false;   // trước lần đọc đầu tiên, thay đổi lẻ chưa phải "dữ liệu đầy đủ"
    const emit = (col, changes) => (subs[col] || []).forEach(s => {
      const m = { fromCache: !loadedOnce, hasPendingWrites: false };
      try { s.next({ docChanges: () => changes, metadata: m, size: changes.length, empty: !changes.length, docs: changes.map(c => c.doc) }); }
      catch (e) { console.error(e); }
    });

    async function loadAll() {
      const rows = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await sb.from(TABLE).select('col,id,data').range(from, from + 999);
        if (error) throw error;
        rows.push(...data);
        if (data.length < 1000) break;
      }
      const by = {};
      rows.forEach(r => (by[r.col] = by[r.col] || []).push({ type: 'added', doc: mk(r.id, r.data) }));
      loadedOnce = true;
      Object.keys(subs).forEach(col => emit(col, by[col] || []));
    }
    function reload() {
      if (loading) return loading;
      loading = loadAll().catch(e => {
        console.error('Supabase:', e);
        setTimeout(reload, 5000);          // thử lại khi mất mạng
      }).finally(() => { loading = null; });
      return loading;
    }

    function start() {
      if (started) return; started = true;
      sb.channel('kiemke-docs')
        .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, p => {
          if (p.eventType === 'DELETE') {
            const o = p.old || {};
            if (o.col) emit(o.col, [{ type: 'removed', doc: mk(o.id, null) }]);
          } else if (p.new && p.new.col) {
            emit(p.new.col, [{ type: 'modified', doc: mk(p.new.id, p.new.data) }]);
          }
        })
        .subscribe(status => {
          // kết nối lại sau khi rớt mạng: đọc lại toàn bộ để không sót thay đổi
          if (status === 'SUBSCRIBED') { if (subscribedOnce) reload(); subscribedOnce = true; }
        });
      reload();
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reload(); });
    }

    function split(path) {
      const i = path.indexOf('/');
      return [path.slice(0, i), path.slice(i + 1)];
    }
    const wrap = error => { const e = new Error(error.message || 'Supabase error'); e.code = 'unavailable'; throw e; };

    return {
      collection(col) {
        return {
          onSnapshot(next, error) {
            (subs[col] = subs[col] || []).push({ next, error });
            setTimeout(start, 0);
            return () => { subs[col] = (subs[col] || []).filter(s => s.next !== next); };
          }
        };
      },
      doc(path) {
        const [col, id] = split(path);
        return {
          async set(data) {
            const { error } = await sb.from(TABLE).upsert({ col, id, data, updated_at: new Date().toISOString() });
            if (error) wrap(error);
          },
          async delete() {
            const { error } = await sb.from(TABLE).delete().eq('col', col).eq('id', id);
            if (error) wrap(error);
          }
        };
      }
    };
  };
})();
