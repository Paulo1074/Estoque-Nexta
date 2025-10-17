// --- Storage helpers ---
const KEYS = {
  products: "estoque_products_v1",
  moves: "estoque_moves_v1",
};

const load = (k) => JSON.parse(localStorage.getItem(k) || "[]");
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));

let products = load(KEYS.products);
let moves = load(KEYS.moves);

// --- Elements ---
const tbody = document.getElementById("moves-tbody");
const sidebarProducts = document.getElementById("sidebar-products");
const productList = document.getElementById("products-list");
const search = document.getElementById("search");
const totalStock = document.getElementById("total-stock");
const countMoves = document.getElementById("count-moves");
const countProducts = document.getElementById("count-products");
const sumQty = document.getElementById("sum-qty");

// --- Modal ---
const modalRoot = document.getElementById("modal-root");
const modalContent = document.getElementById("modal-content");
const closeModalBtn = document.getElementById("close-modal");

function openModal(html) {
  modalContent.innerHTML = html;
  modalRoot.style.display = "flex";
}
function closeModal() {
  modalRoot.style.display = "none";
}
closeModalBtn.onclick = closeModal;

// --- Render ---
function renderProducts() {
  sidebarProducts.innerHTML = "";
  productList.innerHTML = "";

  products.forEach((p, i) => {
    sidebarProducts.innerHTML += `<div class="small">${p.name} — ${p.qty} un</div>`;

    productList.innerHTML += `
      <div class="product-item">
        <div>
          <strong>${p.name}</strong>
          <div class="small">SKU: ${p.sku || "-"} · ${p.qty} un</div>
        </div>
        <button class="btn" onclick="editProduct(${i})">Editar</button>
      </div>
    `;
  });

  countProducts.textContent = products.length;
  const total = products.reduce((a, b) => a + Number(b.qty || 0), 0);
  sumQty.textContent = total;
  totalStock.textContent = total;
}

function renderMoves(f = "") {
  tbody.innerHTML = "";
  moves
    .filter(
      (m) =>
        !f ||
        m.product.toLowerCase().includes(f.toLowerCase()) ||
        m.description.toLowerCase().includes(f.toLowerCase())
    )
    .forEach((m, i) => {
      const cls = m.type === "Entrada" ? "row-entrada" : "row-saida";
      tbody.innerHTML += `
        <tr class="${cls}">
          <td>${new Date(m.datetime).toLocaleString()}</td>
          <td>${m.product}</td>
          <td>${m.entity}</td>
          <td>${m.type}</td>
          <td>${m.qty}</td>
          <td>${m.finalQty}</td>
          <td>R$ ${m.unitCost.toFixed(2)}</td>
          <td>R$ ${m.totalCost.toFixed(2)}</td>
          <td>${m.description}</td>
          <td><button class="btn" onclick="deleteMove(${i})">Excluir</button></td>
        </tr>`;
    });
  countMoves.textContent = moves.length;
}

// --- CRUD Produtos ---
function addProduct() {
  openModal(`
    <h3>Novo Produto</h3>
    <label>Nome</label><input id="pname"><br>
    <label>SKU</label><input id="psku"><br>
    <label>Quantidade</label><input id="pqty" type="number"><br>
    <label>Custo (R$)</label><input id="pcost" type="number"><br>
    <button class="btn primary" id="saveP">Salvar</button>
  `);
  document.getElementById("saveP").onclick = () => {
    const p = {
      name: pname.value,
      sku: psku.value,
      qty: Number(pqty.value || 0),
      unitCost: Number(pcost.value || 0),
    };
    products.push(p);
    save(KEYS.products, products);
    renderProducts();
    closeModal();
  };
}

function editProduct(i) {
  const p = products[i];
  openModal(`
    <h3>Editar Produto</h3>
    <label>Nome</label><input id="pname" value="${p.name}"><br>
    <label>Quantidade</label><input id="pqty" type="number" value="${p.qty}"><br>
    <button class="btn primary" id="updP">Atualizar</button>
  `);
  document.getElementById("updP").onclick = () => {
    p.name = pname.value;
    p.qty = Number(pqty.value);
    save(KEYS.products, products);
    renderProducts();
    closeModal();
  };
}

// --- CRUD Movimentações ---
function addMove() {
  const opts = products
    .map((p) => `<option value="${p.name}">${p.name}</option>`)
    .join("");
  openModal(`
    <h3>Nova Movimentação</h3>
    <label>Produto</label><select id="mprod">${opts}</select><br>
    <label>Tipo</label><select id="mtype"><option>Entrada</option><option>Saída</option></select><br>
    <label>Quantidade</label><input id="mqty" type="number"><br>
    <label>Custo Unit. (R$)</label><input id="mcost" type="number"><br>
    <label>Descrição</label><input id="mdesc"><br>
    <button class="btn primary" id="saveM">Salvar</button>
  `);

  document.getElementById("saveM").onclick = () => {
    const prod = products.find((p) => p.name === mprod.value);
    const type = mtype.value;
    const qty = Number(mqty.value);
    const unit = Number(mcost.value);
    const desc = mdesc.value;

    let finalQty = prod.qty;
    if (type === "Entrada") finalQty += qty;
    else finalQty -= qty;

    prod.qty = finalQty;
    const move = {
      datetime: new Date().toISOString(),
      product: prod.name,
      entity: "",
      type,
      qty,
      finalQty,
      unitCost: unit,
      totalCost: unit * qty,
      description: desc,
    };
    moves.unshift(move);
    save(KEYS.moves, moves);
    save(KEYS.products, products);
    renderMoves(search.value);
    renderProducts();
    closeModal();
  };
}

function deleteMove(i) {
  const m = moves[i];
  const prod = products.find((p) => p.name === m.product);
  if (prod) {
    prod.qty += m.type === "Entrada" ? -m.qty : m.qty;
  }
  moves.splice(i, 1);
  save(KEYS.moves, moves);
  save(KEYS.products, products);
  renderMoves(search.value);
  renderProducts();
}

// --- Exportar CSV ---
function exportCSV() {
  const rows = [
    ["Data", "Produto", "Tipo", "Qtd", "Final", "CustoUnit", "CustoTotal", "Descrição"],
    ...moves.map((m) => [
      m.datetime,
      m.product,
      m.type,
      m.qty,
      m.finalQty,
      m.unitCost,
      m.totalCost,
      m.description,
    ]),
  ];
  const csv = rows.map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "estoque.csv";
  a.click();
}

// --- Event listeners ---
document.getElementById("open-product").onclick = addProduct;
document.getElementById("open-move").onclick = addMove;
document.getElementById("export-csv").onclick = exportCSV;
search.oninput = () => renderMoves(search.value);

// --- Inicialização ---
renderProducts();
renderMoves();
