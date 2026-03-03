// Neon Shop Logic for Nocturne Velocity
// Tabs, purchases, persistence, and UI feedback

document.addEventListener('DOMContentLoaded', function () {
  // Elements
  const tabButtons = document.querySelectorAll('.shop-tab');
  const tabContents = document.querySelectorAll('.shop-tab-content');
  const cjBalance = document.getElementById('cj-balance');
  const closeBtn = document.getElementById('shop-close');

  // Shop Data
  const SHOP_ITEMS = {
    vaisseaux: [
      { id: 'ship1', name: 'Vaisseau Alpha', price: 0, owned: true, desc: 'Vaisseau de base, équilibré.' },
      { id: 'ship2', name: 'Vaisseau Beta', price: 200, owned: false, desc: 'Plus rapide, moins de vie.' },
      { id: 'ship3', name: 'Vaisseau Gamma', price: 400, owned: false, desc: 'Plus de vie, moins rapide.' }
    ],
    bonus: [
      { id: 'bonus1', name: 'Bouclier', price: 150, desc: 'Protège une fois contre un tir.' },
      { id: 'bonus2', name: 'Laser+', price: 250, desc: 'Augmente la puissance du laser.' },
      { id: 'bonus3', name: 'Vitesse+', price: 180, desc: 'Augmente la vitesse du vaisseau.' }
    ]
  };

  // Persistence helpers
  function getSave() {
    return JSON.parse(localStorage.getItem('nv_shop_save') || '{}');
  }
  function setSave(save) {
    localStorage.setItem('nv_shop_save', JSON.stringify(save));
  }

  // CJ (currency) helpers
  function getCJ() {
    const save = getSave();
    return save.cj || 0;
  }
  function setCJ(amount) {
    const save = getSave();
    save.cj = amount;
    setSave(save);
  }

  // Shop item ownership
  function isOwned(id) {
    const save = getSave();
    return save.owned && save.owned[id];
  }
  function setOwned(id) {
    const save = getSave();
    if (!save.owned) save.owned = {};
    save.owned[id] = true;
    setSave(save);
  }

  // Render shop items
  function renderShop() {
    // Vaisseaux
    const vaisseauxList = document.getElementById('shop-vaisseaux-list');
    vaisseauxList.innerHTML = '';
    SHOP_ITEMS.vaisseaux.forEach(item => {
      const owned = item.owned || isOwned(item.id);
      const div = document.createElement('div');
      div.className = 'shop-item';
      div.innerHTML = `
        <div>
          <div><b>${item.name}</b></div>
          <div style="font-size:0.9em; color:#00fff7bb;">${item.desc}</div>
        </div>
        <button class="shop-buy" data-id="${item.id}" ${owned ? 'disabled' : ''}>${owned ? 'Possédé' : item.price + ' CJ'}</button>
      `;
      vaisseauxList.appendChild(div);
    });
    // Bonus
    const bonusList = document.getElementById('shop-bonus-list');
    bonusList.innerHTML = '';
    SHOP_ITEMS.bonus.forEach(item => {
      const owned = isOwned(item.id);
      const div = document.createElement('div');
      div.className = 'shop-item';
      div.innerHTML = `
        <div>
          <div><b>${item.name}</b></div>
          <div style="font-size:0.9em; color:#00fff7bb;">${item.desc}</div>
        </div>
        <button class="shop-buy" data-id="${item.id}" ${owned ? 'disabled' : ''}>${owned ? 'Acheté' : item.price + ' CJ'}</button>
      `;
      bonusList.appendChild(div);
    });
    // Update CJ
    cjBalance.textContent = getCJ() + ' CJ';
  }

  // Tab switching
  tabButtons.forEach((btn, idx) => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.style.display = 'none');
      btn.classList.add('active');
      tabContents[idx].style.display = 'block';
    });
  });
  // Default tab
  tabButtons[0].classList.add('active');
  tabContents[0].style.display = 'block';
  tabContents[1].style.display = 'none';

  // Purchase logic
  document.getElementById('shop-vaisseaux-list').addEventListener('click', function (e) {
    if (e.target.classList.contains('shop-buy')) {
      const id = e.target.getAttribute('data-id');
      const item = SHOP_ITEMS.vaisseaux.find(i => i.id === id);
      if (!item) return;
      if (isOwned(id)) return;
      let cj = getCJ();
      if (cj < item.price) {
        e.target.textContent = 'Pas assez!';
        setTimeout(renderShop, 900);
        return;
      }
      setCJ(cj - item.price);
      setOwned(id);
      renderShop();
    }
  });
  document.getElementById('shop-bonus-list').addEventListener('click', function (e) {
    if (e.target.classList.contains('shop-buy')) {
      const id = e.target.getAttribute('data-id');
      const item = SHOP_ITEMS.bonus.find(i => i.id === id);
      if (!item) return;
      if (isOwned(id)) return;
      let cj = getCJ();
      if (cj < item.price) {
        e.target.textContent = 'Pas assez!';
        setTimeout(renderShop, 900);
        return;
      }
      setCJ(cj - item.price);
      setOwned(id);
      renderShop();
    }
  });

  // Close button
  closeBtn.addEventListener('click', function () {
    window.location.href = 'index.html';
  });

  // Initial render
  renderShop();
});
