/**
 * 데이터 저장소 (localStorage 기반)
 */

const Store = (() => {
  const KEYS = {
    products: 'mylife_products',
    sessions: 'mylife_sessions',
    currentSession: 'mylife_current_session',
  };

  // UUID 생성
  function generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // localStorage 읽기/쓰기
  function load(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Store load error:', key, e);
      return null;
    }
  }

  function save(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error('Store save error:', key, e);
    }
  }

  // ===== 상품 관리 =====
  function getProducts() {
    let products = load(KEYS.products);
    if (!products || products.length === 0) {
      products = JSON.parse(JSON.stringify(DEFAULT_PRODUCTS));
      save(KEYS.products, products);
    }
    return products;
  }

  function getActiveProducts() {
    return getProducts().filter(p => p.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  }

  function getProductById(id) {
    return getProducts().find(p => p.id === id);
  }

  function saveProducts(products) {
    save(KEYS.products, products);
  }

  function addProduct(product) {
    const products = getProducts();
    product.id = generateId();
    product.sortOrder = products.length + 1;
    products.push(product);
    saveProducts(products);
    return product;
  }

  function updateProduct(id, updates) {
    const products = getProducts();
    const idx = products.findIndex(p => p.id === id);
    if (idx !== -1) {
      products[idx] = { ...products[idx], ...updates };
      saveProducts(products);
    }
    return products[idx];
  }

  // ===== 세션 관리 =====
  function getSessions() {
    return load(KEYS.sessions) || [];
  }

  function getCurrentSessionId() {
    return load(KEYS.currentSession);
  }

  function setCurrentSession(sessionId) {
    save(KEYS.currentSession, sessionId);
  }

  function getCurrentSession() {
    const id = getCurrentSessionId();
    if (!id) return null;
    const sessions = getSessions();
    return sessions.find(s => s.id === id) || null;
  }

  function createSession(name, date) {
    const sessions = getSessions();
    const session = {
      id: generateId(),
      name: name || '새 워크숍',
      date: date || new Date().toISOString().slice(0, 10),
      participants: [],
      records: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    sessions.push(session);
    save(KEYS.sessions, sessions);
    setCurrentSession(session.id);
    return session;
  }

  function updateSession(sessionId, updates) {
    const sessions = getSessions();
    const idx = sessions.findIndex(s => s.id === sessionId);
    if (idx !== -1) {
      sessions[idx] = { ...sessions[idx], ...updates, updatedAt: new Date().toISOString() };
      save(KEYS.sessions, sessions);
    }
    return sessions[idx];
  }

  function deleteSession(sessionId) {
    let sessions = getSessions();
    sessions = sessions.filter(s => s.id !== sessionId);
    save(KEYS.sessions, sessions);
    if (getCurrentSessionId() === sessionId) {
      setCurrentSession(sessions.length > 0 ? sessions[0].id : null);
    }
  }

  function duplicateSession(sessionId) {
    const sessions = getSessions();
    const source = sessions.find(s => s.id === sessionId);
    if (!source) return null;
    const newSession = JSON.parse(JSON.stringify(source));
    newSession.id = generateId();
    newSession.name = source.name + ' (복사)';
    newSession.createdAt = new Date().toISOString();
    newSession.updatedAt = new Date().toISOString();
    // 새 ID 부여
    newSession.participants.forEach(p => { p.id = generateId(); });
    const participantMap = {};
    source.participants.forEach((p, i) => {
      participantMap[p.id] = newSession.participants[i].id;
    });
    newSession.records.forEach(r => {
      r.id = generateId();
      r.participantId = participantMap[r.participantId] || r.participantId;
    });
    sessions.push(newSession);
    save(KEYS.sessions, sessions);
    return newSession;
  }

  // ===== 참가자 관리 =====
  function getParticipants() {
    const session = getCurrentSession();
    if (!session) return [];
    return session.participants.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  function addParticipant(name) {
    const session = getCurrentSession();
    if (!session) return null;
    // 중복 이름 체크
    const existing = session.participants.find(p => p.name === name.trim());
    if (existing) return existing;
    const participant = {
      id: generateId(),
      name: name.trim(),
      sortOrder: session.participants.length + 1,
    };
    session.participants.push(participant);
    updateSession(session.id, { participants: session.participants });
    return participant;
  }

  function removeParticipant(participantId) {
    const session = getCurrentSession();
    if (!session) return;
    session.participants = session.participants.filter(p => p.id !== participantId);
    updateSession(session.id, { participants: session.participants });
  }

  // ===== 투자 기록 관리 =====
  function getRecords() {
    const session = getCurrentSession();
    if (!session) return [];
    return session.records || [];
  }

  function addRecord(record) {
    const session = getCurrentSession();
    if (!session) return null;
    record.id = generateId();
    record.createdAt = new Date().toISOString();
    record.updatedAt = new Date().toISOString();
    if (!session.records) session.records = [];
    session.records.push(record);
    updateSession(session.id, { records: session.records });
    return record;
  }

  function updateRecord(recordId, updates) {
    const session = getCurrentSession();
    if (!session) return null;
    const idx = session.records.findIndex(r => r.id === recordId);
    if (idx !== -1) {
      session.records[idx] = { ...session.records[idx], ...updates, updatedAt: new Date().toISOString() };
      updateSession(session.id, { records: session.records });
      return session.records[idx];
    }
    return null;
  }

  function deleteRecord(recordId) {
    const session = getCurrentSession();
    if (!session) return;
    session.records = session.records.filter(r => r.id !== recordId);
    updateSession(session.id, { records: session.records });
  }

  // 중복 저장 방지: 같은 참가자+턴+상품+금액이 최근 5초 이내에 저장됐는지 체크
  function isDuplicate(record) {
    const session = getCurrentSession();
    if (!session || !session.records) return false;
    const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString();
    return session.records.some(r =>
      r.participantId === record.participantId &&
      r.turn === record.turn &&
      r.productId === record.productId &&
      r.amount === record.amount &&
      r.createdAt > fiveSecondsAgo
    );
  }

  // ===== 참가자 요약 =====
  function getParticipantSummary(participantId) {
    const records = getRecords().filter(r => r.participantId === participantId);
    return {
      totalCount: records.length,
      successCount: records.filter(r => r.result === 'success').length,
      failCount: records.filter(r => r.result === 'fail').length,
      preserveCount: records.filter(r => r.result === 'preserve').length,
      totalProfit: records.reduce((sum, r) => sum + (r.profitAmount || 0), 0),
      totalLoss: records.reduce((sum, r) => sum + (r.lossAmount || 0), 0),
      totalPreserve: records.reduce((sum, r) => sum + (r.preserveAmount || 0), 0),
      get netResult() { return this.totalProfit + this.totalLoss; },
    };
  }

  // ===== 내보내기/백업 =====
  function exportFullJSON() {
    return {
      exportDate: new Date().toISOString(),
      products: getProducts(),
      sessions: getSessions(),
      currentSessionId: getCurrentSessionId(),
    };
  }

  function importFullJSON(data) {
    if (data.products) save(KEYS.products, data.products);
    if (data.sessions) save(KEYS.sessions, data.sessions);
    if (data.currentSessionId) setCurrentSession(data.currentSessionId);
  }

  function resetCurrentSession() {
    const session = getCurrentSession();
    if (!session) return;
    session.participants = [];
    session.records = [];
    updateSession(session.id, { participants: [], records: [] });
  }

  return {
    generateId,
    getProducts,
    getActiveProducts,
    getProductById,
    saveProducts,
    addProduct,
    updateProduct,
    getSessions,
    getCurrentSession,
    getCurrentSessionId,
    setCurrentSession,
    createSession,
    updateSession,
    deleteSession,
    duplicateSession,
    getParticipants,
    addParticipant,
    removeParticipant,
    getRecords,
    addRecord,
    updateRecord,
    deleteRecord,
    isDuplicate,
    getParticipantSummary,
    exportFullJSON,
    importFullJSON,
    resetCurrentSession,
  };
})();
