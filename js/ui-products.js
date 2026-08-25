/**
 * 상품 설정 화면
 */

const UIProducts = (() => {

  function render() {
    const panel = document.getElementById('tab-products');
    const products = Store.getProducts().sort((a, b) => a.sortOrder - b.sortOrder);

    panel.innerHTML = `
      <div class="card">
        <div class="flex-between mb-12">
          <div class="card-title" style="margin:0">투자상품 설정</div>
          <button class="btn btn-primary btn-sm" id="addProductBtn">+ 상품 추가</button>
        </div>

        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>순서</th>
                <th>상품명</th>
                <th class="text-center">수익률</th>
                <th class="text-center">손실률</th>
                <th class="text-center">중도해약</th>
                <th class="text-center">수익 주사위</th>
                <th class="text-center">보존 주사위</th>
                <th class="text-center">손실 주사위</th>
                <th class="text-center">사용</th>
                <th class="text-center">작업</th>
              </tr>
            </thead>
            <tbody id="productsBody">
              ${products.map(p => renderProductRow(p)).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- 상품 추가/수정 폼 -->
      <div id="productFormCard" class="card" style="display:none">
        <div class="card-title" id="productFormTitle">상품 추가</div>
        <div class="inline-form">
          <div class="form-group">
            <label class="form-label">상품명</label>
            <input type="text" class="form-input" id="pf_name">
          </div>
          <div class="form-group">
            <label class="form-label">수익률 (%)</label>
            <input type="number" class="form-input" id="pf_profitRate" step="1">
          </div>
          <div class="form-group">
            <label class="form-label">손실률 (%)</label>
            <input type="number" class="form-input" id="pf_lossRate" step="1" max="0">
          </div>
          <div class="form-group">
            <label class="form-label">중도해약 이율 (%)</label>
            <input type="number" class="form-input" id="pf_earlyTermRate" step="1">
          </div>
          <div class="form-group">
            <label class="form-label">수익 주사위 (예: 1,2,3)</label>
            <input type="text" class="form-input" id="pf_profitDice" placeholder="1,2,3">
          </div>
          <div class="form-group">
            <label class="form-label">원금보존 주사위</label>
            <input type="text" class="form-input" id="pf_preserveDice" placeholder="4">
          </div>
          <div class="form-group">
            <label class="form-label">손실 주사위</label>
            <input type="text" class="form-input" id="pf_lossDice" placeholder="5,6">
          </div>
        </div>
        <div class="mt-12 flex gap-8">
          <button class="btn btn-primary" id="pf_saveBtn">저장</button>
          <button class="btn btn-secondary" id="pf_cancelBtn">취소</button>
        </div>
      </div>
    `;

    bindEvents();
  }

  function renderProductRow(p) {
    return `
      <tr data-id="${p.id}">
        <td class="text-center">${p.sortOrder}</td>
        <td><strong>${p.name}</strong></td>
        <td class="text-center amount-positive">${Utils.formatPercent(p.profitRate)}</td>
        <td class="text-center ${p.lossRate < 0 ? 'amount-negative' : ''}">${Utils.formatPercent(p.lossRate)}</td>
        <td class="text-center">${Utils.formatPercent(p.earlyTermRate)}</td>
        <td class="text-center">${p.profitDice.join(',') || '-'}</td>
        <td class="text-center">${p.preserveDice.join(',') || '-'}</td>
        <td class="text-center">${p.lossDice.join(',') || '-'}</td>
        <td class="text-center">
          <button class="btn btn-sm ${p.isActive ? 'btn-success' : 'btn-secondary'} toggle-active" data-id="${p.id}">
            ${p.isActive ? '사용중' : '미사용'}
          </button>
        </td>
        <td class="text-center">
          <button class="btn btn-secondary btn-sm edit-product" data-id="${p.id}">수정</button>
        </td>
      </tr>
    `;
  }

  function bindEvents() {
    // 상품 추가 버튼
    document.getElementById('addProductBtn').addEventListener('click', () => {
      showForm(null);
    });

    // 테이블 이벤트 위임
    document.getElementById('productsBody').addEventListener('click', e => {
      const toggleBtn = e.target.closest('.toggle-active');
      const editBtn = e.target.closest('.edit-product');

      if (toggleBtn) {
        const id = toggleBtn.dataset.id;
        const product = Store.getProductById(id);
        Store.updateProduct(id, { isActive: !product.isActive });
        render();
        Utils.showToast(product.isActive ? '미사용으로 변경' : '사용중으로 변경');
      }

      if (editBtn) {
        const id = editBtn.dataset.id;
        showForm(id);
      }
    });

    // 저장/취소 버튼
    document.getElementById('pf_saveBtn').addEventListener('click', saveProduct);
    document.getElementById('pf_cancelBtn').addEventListener('click', () => {
      document.getElementById('productFormCard').style.display = 'none';
    });
  }

  let editingProductId = null;

  function showForm(productId) {
    editingProductId = productId;
    const formCard = document.getElementById('productFormCard');
    const title = document.getElementById('productFormTitle');
    formCard.style.display = 'block';

    if (productId) {
      title.textContent = '상품 수정';
      const p = Store.getProductById(productId);
      document.getElementById('pf_name').value = p.name;
      document.getElementById('pf_profitRate').value = (p.profitRate * 100).toFixed(0);
      document.getElementById('pf_lossRate').value = (p.lossRate * 100).toFixed(0);
      document.getElementById('pf_earlyTermRate').value = (p.earlyTermRate * 100).toFixed(0);
      document.getElementById('pf_profitDice').value = p.profitDice.join(',');
      document.getElementById('pf_preserveDice').value = p.preserveDice.join(',');
      document.getElementById('pf_lossDice').value = p.lossDice.join(',');
    } else {
      title.textContent = '상품 추가';
      document.getElementById('pf_name').value = '';
      document.getElementById('pf_profitRate').value = '';
      document.getElementById('pf_lossRate').value = '';
      document.getElementById('pf_earlyTermRate').value = '';
      document.getElementById('pf_profitDice').value = '';
      document.getElementById('pf_preserveDice').value = '';
      document.getElementById('pf_lossDice').value = '';
    }

    formCard.scrollIntoView({ behavior: 'smooth' });
  }

  function parseDice(str) {
    if (!str || !str.trim()) return [];
    return str.split(',').map(s => parseInt(s.trim())).filter(n => n >= 1 && n <= 6);
  }

  function saveProduct() {
    const name = document.getElementById('pf_name').value.trim();
    if (!name) {
      Utils.showToast('상품명을 입력해 주세요');
      return;
    }

    const data = {
      name,
      profitRate: parseFloat(document.getElementById('pf_profitRate').value || 0) / 100,
      lossRate: parseFloat(document.getElementById('pf_lossRate').value || 0) / 100,
      earlyTermRate: parseFloat(document.getElementById('pf_earlyTermRate').value || 0) / 100,
      profitDice: parseDice(document.getElementById('pf_profitDice').value),
      preserveDice: parseDice(document.getElementById('pf_preserveDice').value),
      lossDice: parseDice(document.getElementById('pf_lossDice').value),
    };

    if (editingProductId) {
      Store.updateProduct(editingProductId, data);
      Utils.showToast('상품 수정 완료');
    } else {
      data.isActive = true;
      Store.addProduct(data);
      Utils.showToast('상품 추가 완료');
    }

    document.getElementById('productFormCard').style.display = 'none';
    render();
  }

  return { render };
})();
