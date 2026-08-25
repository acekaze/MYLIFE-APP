/**
 * 앱 메인 - 초기화 및 탭 전환
 */

const App = (() => {
  function init() {
    // 세션 없으면 기본 세션 생성
    if (!Store.getCurrentSession()) {
      const sessions = Store.getSessions();
      if (sessions.length > 0) {
        Store.setCurrentSession(sessions[0].id);
      } else {
        Store.createSession('새 워크숍', new Date().toISOString().slice(0, 10));
      }
    }

    setupTabs();
    updateSessionInfo();
    renderCurrentTab();
  }

  function setupTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        // 탭 버튼 활성화
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // 패널 전환
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        const tabId = 'tab-' + btn.dataset.tab;
        document.getElementById(tabId).classList.add('active');

        renderCurrentTab();
      });
    });

    // 키보드 단축키
    document.addEventListener('keydown', e => {
      if (e.altKey) {
        switch (e.key) {
          case '1': document.querySelector('[data-tab="invest"]').click(); break;
          case '2': document.querySelector('[data-tab="records"]').click(); break;
          case '3': document.querySelector('[data-tab="search"]').click(); break;
          case '4': document.querySelector('[data-tab="products"]').click(); break;
          case '5': document.querySelector('[data-tab="settings"]').click(); break;
        }
      }
    });
  }

  function renderCurrentTab() {
    const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
    switch (activeTab) {
      case 'invest': UIInvest.render(); break;
      case 'records': UIRecords.render(); break;
      case 'search': UISearch.render(); break;
      case 'products': UIProducts.render(); break;
      case 'settings': UISettings.render(); break;
    }
  }

  function updateSessionInfo() {
    const session = Store.getCurrentSession();
    const el = document.getElementById('sessionInfo');
    if (session) {
      el.textContent = `${session.name} | ${session.date}`;
    } else {
      el.textContent = '';
    }
  }

  // DOM 로드 후 실행
  document.addEventListener('DOMContentLoaded', init);

  return { updateSessionInfo, renderCurrentTab };
})();
