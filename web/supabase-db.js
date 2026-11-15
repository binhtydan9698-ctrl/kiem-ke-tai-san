/*
 * Bộ nối Supabase cho trang kiểm kê.
 * Giả lập đúng phần nhỏ của "db" mà trang dùng khi chạy trong Claude:
 *   db.collection(col).onSnapshot(next, error)   -> nhận thay đổi theo thời gian thực
 *   db.doc("col/id").set(data) / .delete()
 *   db.recent(col, {...})                         -> đọc lịch sử thao tác (chỉ có ở bản web)
 * Mọi tài liệu nằm trong một bảng: public.kiemke_docs (col, id, data jsonb) — xem supabase/schema.sql.
 */
(function () {
  const TABLE = 'kiemke_docs';
  const LOG = 'log';

  // Một kết nối Supabase dùng chung cho cả trang (dữ liệu kiểm kê + đăng nhập trong dang-nhap.js).
  // Phiên đăng nhập giữ trên máy (localStorage 'kiemke-dang-nhap'); khi đã bật đăng nhập, mọi đọc/ghi đi kèm phiên này.
  window.kiemkeSupabase = function () {
    if (window.KIEMKE_SB) return window.KIEMKE_SB;
    const cfg = window.KIEMKE_SUPABASE || {};
    if (!cfg.url || !cfg.anonKey || !window.supabase || !window.supabase.createClient) return null;
    // "Ghi nhớ đăng nhập trên máy này" (màn hình đăng nhập, khoá localStorage 'kiemke-nho'): bỏ chọn → phiên chỉ giữ trong
    // sessionStorage, đóng trình duyệt là mất (máy dùng chung — BAO-MAT.md)
    const nho = () => { try { return localStorage.getItem('kiemke-nho') !== '0'; } catch (e) { return true; } };
    const kho = {
      getItem: k => { try { return sessionStorage.getItem(k) ?? localStorage.getItem(k); } catch (e) { return null; } },
      setItem: (k, v) => { try { if (nho()) { localStorage.setItem(k, v); sessionStorage.removeItem(k); } else { sessionStorage.setItem(k, v); localStorage.removeItem(k); } } catch (e) { } },
      removeItem: k => { try { localStorage.removeItem(k); sessionStorage.removeItem(k); } catch (e) { } },
    };
    window.KIEMKE_SB = window.supabase.createClient(cfg.url, cfg.anonKey,
      { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'kiemke-dang-nhap', storage: kho } });
    return window.KIEMKE_SB;
  };

  window.makeSupabaseDb = function () {
    const sb = window.kiemkeSupabase();
    if (!sb) return null;

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
        // Lịch sử thao tác (col 'log') không tải lúc mở trang, chỉ đọc khi mở trang "Lịch sử" (hàm recent)
        const { data, error } = await sb.from(TABLE).select('col,id,data').neq('col', LOG).range(from, from + 999);
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
          } else if (p.new && p.new.col && p.new.col !== LOG) {
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
      // Đọc các tài liệu mới nhất của một loại, mới trước cũ sau (id tăng theo thời gian).
      // o = {limit, before: id (lấy cũ hơn id này), kind, who: {by, dev} (lọc theo tên HOẶC máy), key: Mã TSCĐ (thao tác của 1 tài sản)}
      async recent(col, o = {}) {
        const qt = s => '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';   // đặt giá trị trong ngoặc kép
        let q = sb.from(TABLE).select('id,data').eq('col', col);
        if (o.kind) q = q.eq('data->>kind', o.kind);
        if (o.who) {
          const f = [];
          if (o.who.by) f.push('data->>by.eq.' + qt(o.who.by));
          if (o.who.dev) f.push('data->>dev.eq.' + qt(o.who.dev));
          if (f.length) q = q.or(f.join(','));
        }
        if (o.key != null) {   // dòng của đúng tài sản này, hoặc dòng gộp nhiều tài sản có chứa nó (data.keys)
          const k = String(o.key);
          q = q.or('data->>key.eq.' + qt(k) + ',data->keys.cs.' + JSON.stringify([k]));
        }
        if (o.before) q = q.lt('id', o.before);
        const { data, error } = await q.order('id', { ascending: false }).limit(o.limit || 200);
        if (error) wrap(error);
        return data || [];
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
