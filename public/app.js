/**
 * ============================================================================
 * HARVESTA - SISTEMA OPERACIONAL RURAL & PWA OFFLINE-FIRST
 * Arquivo: app.js
 * Desenvolvido para Pequenos e Médios Produtores Rurais Familiares
 * Compatível: Qualquer hospedagem estática (Hostinger, GitHub Pages, Vercel)
 * ============================================================================
 */

// Estado da Aplicação em Memória e LocalStorage
const STORAGE_KEYS = {
  SAFRAS: 'harvesta_safras_v1',
  ACTIVE_SAFRA: 'harvesta_active_safra_id_v1',
  LANCAMENTOS: 'harvesta_lancamentos_v1',
  WEATHER_CACHE: 'harvesta_weather_cache_v1',
  COTATION_CACHE: 'harvesta_cotacoes_cache_v1',
  SETTINGS: 'harvesta_user_settings_v1'
};

// Dados padrão iniciais (caso seja o primeiro acesso do produtor na roça)
const DEFAULT_SAFRAS = [
  {
    id: 'safra-2024-25',
    nome: 'Safra Principal 2024/2025',
    culturaPrincipal: 'Soja',
    areaHectares: 45,
    dataInicio: '2024-10-01',
    dataFim: '2025-04-30',
    status: 'ativa'
  },
  {
    id: 'safra-safrinha-24',
    nome: 'Safrinha Milho 2024',
    culturaPrincipal: 'Milho',
    areaHectares: 30,
    dataInicio: '2024-02-15',
    dataFim: '2024-07-20',
    status: 'finalizada'
  }
];

const DEFAULT_LANCAMENTOS = [
  {
    id: 'lanc-01',
    safraId: 'safra-2024-25',
    tipo: 'despesa',
    descricao: 'Adubo NPK 04-14-08 (15 toneladas)',
    categoria: 'Adubo & Fertilizante',
    cultura: 'Soja',
    valor: 42500.00,
    data: '2024-10-12',
    observacao: 'Comprado na cooperativa local'
  },
  {
    id: 'lanc-02',
    safraId: 'safra-2024-25',
    tipo: 'despesa',
    descricao: 'Sementes Soja Intacta 2 PRO (60 sacos)',
    categoria: 'Sementes',
    cultura: 'Soja',
    valor: 26400.00,
    data: '2024-10-18',
    observacao: 'Germinação 94% testada'
  },
  {
    id: 'lanc-03',
    safraId: 'safra-2024-25',
    tipo: 'despesa',
    descricao: 'Óleo Diesel S10 (3.000 Litros)',
    categoria: 'Combustível & Óleo',
    cultura: 'Soja',
    valor: 17850.00,
    data: '2024-11-04',
    observacao: 'Abastecimento para plantio do talhão 1 ao 4'
  },
  {
    id: 'lanc-04',
    safraId: 'safra-2024-25',
    tipo: 'receita',
    descricao: 'Venda antecipada de Soja (500 sacas no contrato futuro)',
    categoria: 'Venda de Colheita',
    cultura: 'Soja',
    valor: 68500.00,
    data: '2024-11-20',
    observacao: 'Fechado a R$ 137,00 por saca com a cerealista'
  },
  {
    id: 'lanc-05',
    safraId: 'safra-2024-25',
    tipo: 'despesa',
    descricao: 'Manutenção Preventiva do Pulverizador e Trator',
    categoria: 'Manutenção de Máquinas',
    cultura: 'Soja',
    valor: 5300.00,
    data: '2024-12-05',
    observacao: 'Troca de bicos e filtros'
  }
];

// Cidades agrícolas com coordenadas para consulta climática rápida
const POLOS_AGRICOLAS = [
  { nome: 'Rio Verde - GO', lat: -17.7925, lon: -50.9192 },
  { nome: 'Sorriso - MT', lat: -12.5442, lon: -55.7226 },
  { nome: 'Cascavel - PR', lat: -24.9578, lon: -53.4595 },
  { nome: 'Ribeirão Preto - SP', lat: -21.1775, lon: -47.8103 },
  { nome: 'Patrocínio - MG', lat: -18.9439, lon: -46.9928 },
  { nome: 'Barreiras - BA', lat: -12.1528, lon: -44.9961 },
  { nome: 'Chapecó - SC', lat: -27.1004, lon: -52.6152 },
  { nome: 'Passo Fundo - RS', lat: -28.2612, lon: -52.4083 },
  { nome: 'Balsas - MA', lat: -7.5322, lon: -46.0356 }
];

// Objeto de Estado Principal
class HarvestaApp {
  constructor() {
    this.safras = [];
    this.lancamentos = [];
    this.activeSafraId = '';
    this.activeTab = 'dashboard';
    this.selectedCity = POLOS_AGRICOLAS[0];
    this.deferredInstallPrompt = null;
    this.isOnline = navigator.onLine;

    // Filtros do caderno
    this.filtroCultura = 'todas';
    this.filtroTipo = 'todos';
    this.filtroBusca = '';

    // Calculadora state
    this.calc = {
      custoTotal: 92050,
      expectativaSacas: 2700,
      areaHectares: 45,
      precoVendaSimulado: 138.00
    };

    // Dados de clima e cotações
    this.weatherData = null;
    this.cotacoes = [
      { cultura: 'Soja (60kg)', praca: 'Paranaguá / Mercado Físico', valor: 137.50, var: 1.15, icon: 'eco' },
      { cultura: 'Milho (60kg)', praca: 'Campinas / Mercado Interno', valor: 64.20, var: -0.45, icon: 'grain' },
      { cultura: 'Café Arábica (60kg)', praca: 'Cerrado Mineiro / Tipo 6', valor: 1420.00, var: 0.85, icon: 'coffee' },
      { cultura: 'Boi Gordo (@ 15kg)', praca: 'São Paulo / Cepea', valor: 312.00, var: 0.32, icon: 'pets' },
      { cultura: 'Trigo (Tonelada)', praca: 'Paraná / Físico', valor: 1280.00, var: -0.10, icon: 'grass' },
      { cultura: 'Leite (Litro)', praca: 'Média Brasil ao Produtor', valor: 2.68, var: 0.75, icon: 'water_drop' },
      { cultura: 'Dólar Comercial', praca: 'PTAX / Câmbio', valor: 5.64, var: -0.28, icon: 'attach_money' }
    ];
  }

  // Inicialização do aplicativo
  init() {
    this.loadState();
    this.registerServiceWorker();
    this.setupNetworkListeners();
    this.setupInstallPrompt();
    this.bindEvents();
    this.fetchDolarRate();
    this.fetchWeather();
    this.render();
  }

  // Carregar dados salvos localmente
  loadState() {
    try {
      const safrasSalvas = localStorage.getItem(STORAGE_KEYS.SAFRAS);
      this.safras = safrasSalvas ? JSON.parse(safrasSalvas) : DEFAULT_SAFRAS;

      const activeId = localStorage.getItem(STORAGE_KEYS.ACTIVE_SAFRA);
      this.activeSafraId = activeId || (this.safras[0] ? this.safras[0].id : '');

      const lancSalvos = localStorage.getItem(STORAGE_KEYS.LANCAMENTOS);
      this.lancamentos = lancSalvos ? JSON.parse(lancSalvos) : DEFAULT_LANCAMENTOS;

      const weatherCached = localStorage.getItem(STORAGE_KEYS.WEATHER_CACHE);
      if (weatherCached) {
        this.weatherData = JSON.parse(weatherCached);
      }
    } catch (e) {
      console.error('[Harvesta] Erro ao carregar dados do LocalStorage:', e);
      this.safras = DEFAULT_SAFRAS;
      this.lancamentos = DEFAULT_LANCAMENTOS;
      this.activeSafraId = this.safras[0].id;
    }
  }

  // Salvar no armazenamento do celular/computador
  saveState() {
    try {
      localStorage.setItem(STORAGE_KEYS.SAFRAS, JSON.stringify(this.safras));
      localStorage.setItem(STORAGE_KEYS.ACTIVE_SAFRA, this.activeSafraId);
      localStorage.setItem(STORAGE_KEYS.LANCAMENTOS, JSON.stringify(this.lancamentos));
    } catch (e) {
      console.error('[Harvesta] Falha ao persistir no armazenamento local:', e);
    }
  }

  // Registro do Service Worker
  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          console.log('[Harvesta] Service Worker ativo com sucesso! Escopo:', reg.scope);
        })
        .catch((err) => {
          console.warn('[Harvesta] Aviso ao registrar Service Worker:', err);
        });
    }
  }

  // Monitorar conexão online/offline
  setupNetworkListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.showToast('Conexão restabelecida! Sincronizando dados...', 'success');
      this.fetchDolarRate();
      this.fetchWeather();
      this.renderNetworkBadge();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.showToast('Sem sinal de internet. Modo Lavoura Ativo!', 'warning');
      this.renderNetworkBadge();
    });
  }

  // Prompt de instalação do PWA
  setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredInstallPrompt = e;
      const installBtn = document.getElementById('btn-pwa-install');
      if (installBtn) {
        installBtn.classList.remove('hidden');
      }
    });

    window.addEventListener('appinstalled', () => {
      this.deferredInstallPrompt = null;
      const installBtn = document.getElementById('btn-pwa-install');
      if (installBtn) installBtn.classList.add('hidden');
      this.showToast('Harvesta instalado com sucesso no seu dispositivo!', 'success');
    });
  }

  async installApp() {
    if (!this.deferredInstallPrompt) {
      // Instrução para iOS Safari
      alert('Para instalar no iPhone ou iPad:\n1. Toque no botão Compartilhar (ícone com quadrado e seta para cima).\n2. Selecione "Adicionar à Tela de Início".');
      return;
    }
    this.deferredInstallPrompt.prompt();
    const { outcome } = await this.deferredInstallPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('[Harvesta] Usuário aceitou a instalação.');
    }
    this.deferredInstallPrompt = null;
  }

  // Buscar cotação atual do Dólar via API pública gratuita
  async fetchDolarRate() {
    if (!navigator.onLine) return;
    try {
      const res = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL');
      if (res.ok) {
        const data = await res.json();
        const usdBrl = data.USDBRL;
        if (usdBrl) {
          const item = this.cotacoes.find(c => c.cultura.includes('Dólar'));
          if (item) {
            item.valor = parseFloat(usdBrl.bid);
            item.var = parseFloat(usdBrl.pctChange);
            localStorage.setItem(STORAGE_KEYS.COTATION_CACHE, JSON.stringify(this.cotacoes));
            this.renderCotacoes();
          }
        }
      }
    } catch (e) {
      console.warn('[Harvesta] Não foi possível obter cotação de dólar ao vivo:', e);
    }
  }

  // Obter previsão climática via Open-Meteo
  async fetchWeather() {
    const lat = this.selectedCity.lat;
    const lon = this.selectedCity.lon;

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&timezone=America%2FSao_Paulo`;

    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        this.weatherData = data;
        localStorage.setItem(STORAGE_KEYS.WEATHER_CACHE, JSON.stringify(data));
        this.renderClima();
      }
    } catch (e) {
      console.warn('[Harvesta] Modo offline no clima, usando dados do cache se disponíveis:', e);
      if (this.weatherData) {
        this.renderClima();
      }
    }
  }

  // Usar geolocalização do GPS do celular
  useGpsLocation() {
    if (!navigator.geolocation) {
      this.showToast('Geolocalização não suportada neste aparelho.', 'error');
      return;
    }

    this.showToast('Obtendo sinal GPS da lavoura...', 'info');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.selectedCity = {
          nome: 'Minha Lavoura (GPS)',
          lat: pos.coords.latitude,
          lon: pos.coords.longitude
        };
        this.showToast('Localização da lavoura obtida com sucesso!', 'success');
        this.fetchWeather();
        this.renderClima();
      },
      (err) => {
        console.warn('Erro GPS:', err);
        this.showToast('Não foi possível obter o GPS. Verifique a permissão.', 'warning');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }

  // Getters de cálculos financeiros da safra ativa
  getActiveSafra() {
    return this.safras.find(s => s.id === this.activeSafraId) || this.safras[0] || null;
  }

  getLancamentosSafraAtiva() {
    if (!this.activeSafraId) return [];
    return this.lancamentos.filter(l => l.safraId === this.activeSafraId);
  }

  getTotaisSafra() {
    const lancs = this.getLancamentosSafraAtiva();
    let receitaTotal = 0;
    let despesaTotal = 0;

    for (const item of lancs) {
      if (item.tipo === 'receita') {
        receitaTotal += Number(item.valor) || 0;
      } else {
        despesaTotal += Number(item.valor) || 0;
      }
    }

    const saldoEstimado = receitaTotal - despesaTotal;
    return { receitaTotal, despesaTotal, saldoEstimado };
  }

  // Formatação de Moeda Brasileira
  formatMoney(val) {
    const num = Number(val) || 0;
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  // Notificação Toast
  showToast(mensagem, tipo = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    const bgColors = {
      success: 'bg-[#2E7D32] text-white',
      error: 'bg-red-700 text-white',
      warning: 'bg-[#F57F17] text-white',
      info: 'bg-zinc-800 text-white'
    };

    toast.className = `px-4 py-3 rounded-xl shadow-xl text-sm font-semibold flex items-center gap-2 transform transition-all duration-300 translate-y-2 opacity-0 ${bgColors[tipo] || bgColors.info}`;
    toast.innerHTML = `<span class="material-icons text-base">info</span><span>${mensagem}</span>`;

    container.appendChild(toast);
    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-2', 'opacity-0');
    });

    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // Eventos de clique e formulários
  bindEvents() {
    // Navegação pelas 4 abas
    document.querySelectorAll('[data-tab-target]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const tab = btn.getAttribute('data-tab-target');
        this.switchTab(tab);
      });
    });

    // Mudança de Safra no cabeçalho
    const safraSelect = document.getElementById('select-safra-header');
    if (safraSelect) {
      safraSelect.addEventListener('change', (e) => {
        this.activeSafraId = e.target.value;
        this.saveState();
        this.render();
      });
    }

    // Botão Instalar PWA
    const btnInstall = document.getElementById('btn-pwa-install');
    if (btnInstall) {
      btnInstall.addEventListener('click', () => this.installApp());
    }

    // Botão GPS
    const btnGps = document.getElementById('btn-use-gps');
    if (btnGps) {
      btnGps.addEventListener('click', () => this.useGpsLocation());
    }

    // Seletor de Cidades no Clima
    const citySelect = document.getElementById('select-clima-cidade');
    if (citySelect) {
      citySelect.addEventListener('change', (e) => {
        const idx = parseInt(e.target.value, 10);
        if (!isNaN(idx) && POLOS_AGRICOLAS[idx]) {
          this.selectedCity = POLOS_AGRICOLAS[idx];
          this.fetchWeather();
        }
      });
    }

    // Formulário de Novo Lançamento
    const formLanc = document.getElementById('form-novo-lancamento');
    if (formLanc) {
      formLanc.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSaveLancamento(e.target);
      });
    }

    // Formulário de Nova Safra
    const formSafra = document.getElementById('form-nova-safra');
    if (formSafra) {
      formSafra.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSaveSafra(e.target);
      });
    }

    // Inputs da Calculadora de Lucro
    const calcInputs = ['calc-custo-total', 'calc-sacas', 'calc-hectares', 'calc-preco-venda'];
    calcInputs.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => this.handleCalcInput());
      }
    });

    // Filtros do Caderno de Campo
    const filtroCulturaEl = document.getElementById('filtro-caderno-cultura');
    if (filtroCulturaEl) {
      filtroCulturaEl.addEventListener('change', (e) => {
        this.filtroCultura = e.target.value;
        this.renderCaderno();
      });
    }

    const filtroTipoEl = document.getElementById('filtro-caderno-tipo');
    if (filtroTipoEl) {
      filtroTipoEl.addEventListener('change', (e) => {
        this.filtroTipo = e.target.value;
        this.renderCaderno();
      });
    }

    const buscaEl = document.getElementById('busca-caderno');
    if (buscaEl) {
      buscaEl.addEventListener('input', (e) => {
        this.filtroBusca = e.target.value.toLowerCase();
        this.renderCaderno();
      });
    }
  }

  // Troca de Abas
  switchTab(tabId) {
    this.activeTab = tabId;
    document.querySelectorAll('.tab-view').forEach((view) => {
      view.classList.add('hidden');
    });

    const activeView = document.getElementById(`view-${tabId}`);
    if (activeView) {
      activeView.classList.remove('hidden');
    }

    // Atualiza botões da barra inferior
    document.querySelectorAll('[data-tab-target]').forEach((btn) => {
      const target = btn.getAttribute('data-tab-target');
      if (target === tabId) {
        btn.classList.add('text-[#2E7D32]', 'font-bold');
        btn.classList.remove('text-zinc-500');
        const icon = btn.querySelector('.material-icons');
        if (icon) icon.classList.add('scale-110');
      } else {
        btn.classList.remove('text-[#2E7D32]', 'font-bold');
        btn.classList.add('text-zinc-500');
        const icon = btn.querySelector('.material-icons');
        if (icon) icon.classList.remove('scale-110');
      }
    });

    // Rola para o topo suavemente
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (tabId === 'calculadora') {
      this.syncCalcFromSafra();
    }
  }

  // Sincronizar custo da safra atual na calculadora
  syncCalcFromSafra() {
    const totais = this.getTotaisSafra();
    const safra = this.getActiveSafra();
    if (totais.despesaTotal > 0) {
      this.calc.custoTotal = totais.despesaTotal;
      const el = document.getElementById('calc-custo-total');
      if (el) el.value = totais.despesaTotal;
    }
    if (safra && safra.areaHectares) {
      this.calc.areaHectares = safra.areaHectares;
      const el = document.getElementById('calc-hectares');
      if (el) el.value = safra.areaHectares;
    }
    this.handleCalcInput();
  }

  // Novo Lançamento
  handleSaveLancamento(form) {
    const formData = new FormData(form);
    const tipo = formData.get('tipo');
    const descricao = formData.get('descricao');
    const categoria = formData.get('categoria');
    const cultura = formData.get('cultura');
    const valor = parseFloat(formData.get('valor')) || 0;
    const data = formData.get('data') || new Date().toISOString().split('T')[0];
    const observacao = formData.get('observacao') || '';

    if (!descricao || valor <= 0) {
      this.showToast('Por favor, preencha a descrição e um valor válido.', 'warning');
      return;
    }

    const novo = {
      id: 'lanc-' + Date.now(),
      safraId: this.activeSafraId,
      tipo,
      descricao,
      categoria,
      cultura,
      valor,
      data,
      observacao
    };

    this.lancamentos.unshift(novo);
    this.saveState();
    this.closeModal('modal-novo-lancamento');
    form.reset();
    this.showToast(`${tipo === 'receita' ? 'Entrada' : 'Despesa'} registrada com sucesso!`, 'success');
    this.render();
  }

  // Excluir Lançamento
  deleteLancamento(id) {
    if (confirm('Tem certeza que deseja apagar este lançamento?')) {
      this.lancamentos = this.lancamentos.filter(l => l.id !== id);
      this.saveState();
      this.showToast('Registro excluído com sucesso.', 'info');
      this.render();
    }
  }

  // Nova Safra
  handleSaveSafra(form) {
    const formData = new FormData(form);
    const nome = formData.get('nome');
    const culturaPrincipal = formData.get('culturaPrincipal');
    const areaHectares = parseFloat(formData.get('areaHectares')) || 1;

    if (!nome) {
      this.showToast('Informe o nome da safra.', 'warning');
      return;
    }

    const nova = {
      id: 'safra-' + Date.now(),
      nome,
      culturaPrincipal,
      areaHectares,
      dataInicio: new Date().toISOString().split('T')[0],
      status: 'ativa'
    };

    this.safras.unshift(nova);
    this.activeSafraId = nova.id;
    this.saveState();
    this.closeModal('modal-nova-safra');
    form.reset();
    this.showToast(`Safra "${nome}" criada e ativada!`, 'success');
    this.render();
  }

  // Cálculo da Calculadora de Lucro
  handleCalcInput() {
    const custoTotalEl = document.getElementById('calc-custo-total');
    const sacasEl = document.getElementById('calc-sacas');
    const hectaresEl = document.getElementById('calc-hectares');
    const precoEl = document.getElementById('calc-preco-venda');

    const custoTotal = parseFloat(custoTotalEl?.value) || 0;
    const sacas = parseFloat(sacasEl?.value) || 1;
    const hectares = parseFloat(hectaresEl?.value) || 1;
    const precoVenda = parseFloat(precoEl?.value) || 0;

    // Custo de Equilíbrio (Break-even por saca)
    const custoMinimoSaca = sacas > 0 ? (custoTotal / sacas) : 0;
    const lucroUnitario = precoVenda - custoMinimoSaca;
    const margemPercentual = precoVenda > 0 ? ((lucroUnitario / precoVenda) * 100) : 0;
    const lucroTotal = lucroUnitario * sacas;
    const produtividadePorHa = hectares > 0 ? (sacas / hectares) : 0;
    const lucroPorHa = hectares > 0 ? (lucroTotal / hectares) : 0;

    // Atualização nos elementos da tela
    const breakEvenEl = document.getElementById('res-custo-minimo');
    if (breakEvenEl) breakEvenEl.textContent = this.formatMoney(custoMinimoSaca);

    const margemEl = document.getElementById('res-margem-pct');
    if (margemEl) {
      margemEl.textContent = `${margemPercentual.toFixed(1)}%`;
      margemEl.className = `text-2xl font-black ${margemPercentual >= 0 ? 'text-[#2E7D32]' : 'text-red-600'}`;
    }

    const lucroSacaEl = document.getElementById('res-lucro-saca');
    if (lucroSacaEl) {
      lucroSacaEl.textContent = this.formatMoney(lucroUnitario);
      lucroSacaEl.className = `text-lg font-bold ${lucroUnitario >= 0 ? 'text-[#2E7D32]' : 'text-red-600'}`;
    }

    const lucroTotalEl = document.getElementById('res-lucro-total');
    if (lucroTotalEl) {
      lucroTotalEl.textContent = this.formatMoney(lucroTotal);
      lucroTotalEl.className = `text-2xl font-black ${lucroTotal >= 0 ? 'text-[#2E7D32]' : 'text-red-600'}`;
    }

    const lucroHaEl = document.getElementById('res-lucro-ha');
    if (lucroHaEl) lucroHaEl.textContent = `${this.formatMoney(lucroPorHa)} / ha`;

    const prodHaEl = document.getElementById('res-prod-ha');
    if (prodHaEl) prodHaEl.textContent = `${produtividadePorHa.toFixed(1)} sc/ha`;
  }

  // Exportar dados em arquivo JSON ou CSV
  exportData(format = 'json') {
    if (format === 'json') {
      const data = {
        safras: this.safras,
        lancamentos: this.lancamentos,
        exportadoEm: new Date().toISOString()
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      this.downloadBlob(blob, `harvesta_backup_${new Date().toISOString().slice(0, 10)}.json`);
      this.showToast('Backup JSON exportado com sucesso!', 'success');
    } else if (format === 'csv') {
      let csv = 'Data,Tipo,Cultura,Categoria,Descricao,Valor,Observacao\n';
      this.lancamentos.forEach(l => {
        csv += `"${l.data}","${l.tipo}","${l.cultura}","${l.categoria}","${l.descricao.replace(/"/g, '""')}","${l.valor}","${(l.observacao || '').replace(/"/g, '""')}"\n`;
      });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      this.downloadBlob(blob, `harvesta_caderno_campo_${new Date().toISOString().slice(0, 10)}.csv`);
      this.showToast('Planilha CSV exportada com sucesso!', 'success');
    }
  }

  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Modais auxiliares
  openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
  }

  closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  }

  // RENDERIZAÇÃO DA INTERFACE
  render() {
    this.renderHeaderSafra();
    this.renderNetworkBadge();
    this.renderDashboard();
    this.renderCaderno();
    this.renderCotacoes();
    this.renderClima();
    this.handleCalcInput();
  }

  renderHeaderSafra() {
    const select = document.getElementById('select-safra-header');
    if (!select) return;

    select.innerHTML = this.safras.map(s => `
      <option value="${s.id}" ${s.id === this.activeSafraId ? 'selected' : ''}>
        ${s.nome} (${s.culturaPrincipal} - ${s.areaHectares} ha)
      </option>
    `).join('');
  }

  renderNetworkBadge() {
    const badge = document.getElementById('badge-network-status');
    if (!badge) return;
    if (this.isOnline) {
      badge.innerHTML = `<span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span><span class="text-xs font-bold text-emerald-800">Conectado</span>`;
      badge.className = 'flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-300';
    } else {
      badge.innerHTML = `<span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span><span class="text-xs font-bold text-amber-900">Modo Roça (Offline)</span>`;
      badge.className = 'flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 border border-amber-400';
    }
  }

  renderDashboard() {
    const { receitaTotal, despesaTotal, saldoEstimado } = this.getTotaisSafra();
    const safra = this.getActiveSafra();

    const saldoEl = document.getElementById('dash-saldo');
    if (saldoEl) {
      saldoEl.textContent = this.formatMoney(saldoEstimado);
      saldoEl.className = `text-3xl font-black ${saldoEstimado >= 0 ? 'text-[#2E7D32]' : 'text-red-600'}`;
    }

    const receitaEl = document.getElementById('dash-receita');
    if (receitaEl) receitaEl.textContent = this.formatMoney(receitaTotal);

    const despesaEl = document.getElementById('dash-despesa');
    if (despesaEl) despesaEl.textContent = this.formatMoney(despesaTotal);

    // Indicador de margem bruta da safra
    const margemBruta = receitaTotal > 0 ? ((saldoEstimado / receitaTotal) * 100).toFixed(1) : '0.0';
    const margemEl = document.getElementById('dash-margem-bruta');
    if (margemEl) margemEl.textContent = `${margemBruta}%`;

    // Custo por hectare
    const custoPorHa = (safra && safra.areaHectares > 0) ? (despesaTotal / safra.areaHectares) : 0;
    const custoHaEl = document.getElementById('dash-custo-ha');
    if (custoHaEl) custoHaEl.textContent = `${this.formatMoney(custoPorHa)} / ha`;

    // Renderizar gráfico de distribuição de despesas por insumo
    this.renderDespesasChart();

    // Renderizar últimos 3 lançamentos no resumo
    const ultimosLancs = this.getLancamentosSafraAtiva().slice(0, 4);
    const containerUltimos = document.getElementById('dash-ultimos-lancamentos');
    if (containerUltimos) {
      if (ultimosLancs.length === 0) {
        containerUltimos.innerHTML = `
          <div class="p-6 text-center text-zinc-500 bg-white rounded-2xl border border-zinc-200">
            Nenhum lançamento nesta safra ainda. Toque em "Novo Lançamento" para começar.
          </div>
        `;
      } else {
        containerUltimos.innerHTML = ultimosLancs.map(l => `
          <div class="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${l.tipo === 'receita' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}">
                <span class="material-icons text-xl">${l.tipo === 'receita' ? 'trending_up' : 'trending_down'}</span>
              </div>
              <div>
                <p class="font-bold text-zinc-900 leading-tight">${l.descricao}</p>
                <div class="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
                  <span class="px-2 py-0.5 rounded bg-zinc-100 font-semibold">${l.categoria}</span>
                  <span>•</span>
                  <span>${l.data.split('-').reverse().join('/')}</span>
                </div>
              </div>
            </div>
            <div class="text-right">
              <span class="font-black text-base ${l.tipo === 'receita' ? 'text-[#2E7D32]' : 'text-red-600'}">
                ${l.tipo === 'receita' ? '+' : '-'} ${this.formatMoney(l.valor)}
              </span>
            </div>
          </div>
        `).join('');
      }
    }
  }

  renderDespesasChart() {
    const container = document.getElementById('dash-despesas-chart-container');
    if (!container) return;

    const { despesaTotal } = this.getTotaisSafra();
    const despesas = this.getLancamentosSafraAtiva().filter(l => l.tipo === 'despesa');

    if (despesas.length === 0 || despesaTotal <= 0) {
      container.innerHTML = `
        <div class="bg-white rounded-3xl p-5 border-2 border-zinc-200 shadow-sm text-center text-zinc-400">
          <span class="material-icons text-3xl text-zinc-300">pie_chart</span>
          <p class="mt-1 text-xs font-bold text-zinc-600">Nenhum custo registrado para gerar o gráfico</p>
        </div>
      `;
      return;
    }

    const categoryColors = {
      'Adubo & Fertilizante': '#2E7D32',
      'Sementes': '#F57F17',
      'Combustível & Óleo': '#E65100',
      'Defensivos': '#00897B',
      'Mão de Obra': '#5E35B1',
      'Manutenção de Máquinas': '#455A64',
      'Outros': '#795548'
    };

    const map = {};
    despesas.forEach(l => {
      const cat = l.categoria || 'Outros';
      map[cat] = (map[cat] || 0) + Number(l.valor);
    });

    const items = Object.entries(map)
      .map(([name, value]) => ({
        name,
        value,
        percentage: (value / despesaTotal) * 100,
        color: categoryColors[name] || '#795548'
      }))
      .sort((a, b) => b.value - a.value);

    // Gera o SVG do gráfico Donut circular
    let cumulativePercent = 0;
    const paths = items.map(slice => {
      const startPercent = cumulativePercent;
      cumulativePercent += slice.percentage;
      const endPercent = cumulativePercent;

      const getCoordinatesForPercent = (percent) => {
        const x = Math.cos(2 * Math.PI * percent);
        const y = Math.sin(2 * Math.PI * percent);
        return [x, y];
      };

      const [startX, startY] = getCoordinatesForPercent(startPercent / 100);
      const [endX, endY] = getCoordinatesForPercent(endPercent / 100);
      const largeArcFlag = slice.percentage > 50 ? 1 : 0;

      // Raio externo = 1, raio interno = 0.6
      const pathData = [
        `M ${startX * 45 + 50} ${startY * 45 + 50}`,
        `A 45 45 0 ${largeArcFlag} 1 ${endX * 45 + 50} ${endY * 45 + 50}`,
        `L ${endX * 26 + 50} ${endY * 26 + 50}`,
        `A 26 26 0 ${largeArcFlag} 0 ${startX * 26 + 50} ${startY * 26 + 50}`,
        'Z'
      ].join(' ');

      return `<path d="${pathData}" fill="${slice.color}" stroke="#FFFFFF" stroke-width="1.5"><title>${slice.name}: ${slice.percentage.toFixed(1)}%</title></path>`;
    }).join('');

    container.innerHTML = `
      <div class="bg-white rounded-3xl p-5 border-2 border-zinc-200 shadow-sm space-y-4">
        <div class="flex items-center justify-between pb-2 border-b border-zinc-100">
          <div>
            <h3 class="text-base font-black text-zinc-900 flex items-center gap-1.5">
              <span class="material-icons text-[#2E7D32] text-xl">pie_chart</span>
              <span>Distribuição de Custos por Insumo</span>
            </h3>
            <p class="text-xs text-zinc-500 font-semibold mt-0.5">
              Composição percentual das despesas na safra
            </p>
          </div>
          <span class="text-xs font-black px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-700">
            Recharts & Agro
          </span>
        </div>

        <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
          <div class="w-44 h-44 shrink-0 relative flex items-center justify-center">
            <svg viewBox="0 0 100 100" class="w-full h-full -rotate-90">
              ${paths}
            </svg>
            <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span class="text-[10px] font-bold text-zinc-400 uppercase">Total</span>
              <span class="text-xs font-black text-zinc-800">${this.formatMoney(despesaTotal)}</span>
            </div>
          </div>

          <div class="w-full space-y-1.5 flex-1">
            ${items.map(item => `
              <div class="p-2 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="w-3 h-3 rounded-full shrink-0" style="background-color: ${item.color}"></span>
                  <span class="text-xs font-black text-zinc-800 leading-tight">${item.name}</span>
                </div>
                <div class="text-right flex items-center gap-2">
                  <span class="text-[11px] font-bold text-zinc-500">${this.formatMoney(item.value)}</span>
                  <span class="text-xs font-black px-1.5 py-0.5 rounded text-white" style="background-color: ${item.color}">
                    ${item.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  renderCaderno() {
    const listContainer = document.getElementById('caderno-lista-lancamentos');
    if (!listContainer) return;

    let items = this.getLancamentosSafraAtiva();

    // Filtro por cultura
    if (this.filtroCultura !== 'todas') {
      items = items.filter(l => l.cultura.toLowerCase() === this.filtroCultura.toLowerCase());
    }

    // Filtro por tipo (receita / despesa)
    if (this.filtroTipo !== 'todos') {
      items = items.filter(l => l.tipo === this.filtroTipo);
    }

    // Filtro por texto de busca
    if (this.filtroBusca.trim() !== '') {
      items = items.filter(l =>
        l.descricao.toLowerCase().includes(this.filtroBusca) ||
        l.categoria.toLowerCase().includes(this.filtroBusca) ||
        (l.observacao && l.observacao.toLowerCase().includes(this.filtroBusca))
      );
    }

    if (items.length === 0) {
      listContainer.innerHTML = `
        <div class="p-8 text-center bg-white rounded-2xl border border-zinc-200">
          <span class="material-icons text-4xl text-zinc-300">menu_book</span>
          <p class="mt-2 font-bold text-zinc-700">Nenhum registro encontrado no filtro</p>
          <p class="text-sm text-zinc-500">Tente ajustar os filtros acima ou adicione uma nova entrada/saída.</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = items.map(l => `
      <div class="bg-white p-4 rounded-2xl border-2 border-zinc-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="flex items-start gap-3">
          <div class="w-12 h-12 rounded-xl flex items-center justify-center font-bold shrink-0 ${l.tipo === 'receita' ? 'bg-emerald-100 text-[#2E7D32]' : 'bg-amber-100 text-[#F57F17]'}">
            <span class="material-icons text-2xl">${l.tipo === 'receita' ? 'attach_money' : 'shopping_cart'}</span>
          </div>
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <span class="px-2 py-0.5 rounded text-xs font-black uppercase tracking-wider ${l.tipo === 'receita' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}">
                ${l.tipo === 'receita' ? 'Entrada / Venda' : 'Despesa / Custo'}
              </span>
              <span class="px-2 py-0.5 rounded text-xs font-bold bg-zinc-100 text-zinc-700">
                ${l.cultura}
              </span>
              <span class="text-xs text-zinc-500 font-medium">
                ${l.data.split('-').reverse().join('/')}
              </span>
            </div>
            <h4 class="font-black text-lg text-zinc-900 mt-1">${l.descricao}</h4>
            <p class="text-xs text-zinc-600 font-semibold">Categoria: ${l.categoria}</p>
            ${l.observacao ? `<p class="text-xs text-zinc-500 italic mt-0.5">"${l.observacao}"</p>` : ''}
          </div>
        </div>

        <div class="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100">
          <div class="text-left sm:text-right">
            <span class="text-xs font-bold text-zinc-500 block">Valor Líquido</span>
            <span class="text-xl font-black ${l.tipo === 'receita' ? 'text-[#2E7D32]' : 'text-red-600'}">
              ${l.tipo === 'receita' ? '+' : '-'} ${this.formatMoney(l.valor)}
            </span>
          </div>
          <button onclick="window.harvesta.deleteLancamento('${l.id}')" title="Excluir Registro" class="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
            <span class="material-icons text-xl">delete</span>
          </button>
        </div>
      </div>
    `).join('');
  }

  renderCotacoes() {
    const container = document.getElementById('container-cotacoes-cards');
    if (!container) return;

    container.innerHTML = this.cotacoes.map(c => `
      <div class="bg-white p-4 rounded-2xl border-2 border-zinc-200 shadow-sm flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-xl bg-emerald-50 text-[#2E7D32] flex items-center justify-center shrink-0">
            <span class="material-icons text-2xl">${c.icon || 'trending_up'}</span>
          </div>
          <div>
            <h4 class="font-black text-zinc-900 text-base leading-tight">${c.cultura}</h4>
            <p class="text-xs text-zinc-500 mt-0.5">${c.praca}</p>
          </div>
        </div>
        <div class="text-right">
          <div class="text-xl font-black text-zinc-900">
            ${c.cultura.includes('Dólar') ? 'R$ ' + c.valor.toFixed(2) : this.formatMoney(c.valor)}
          </div>
          <div class="flex items-center justify-end gap-1 text-xs font-bold ${c.var >= 0 ? 'text-emerald-700' : 'text-red-600'}">
            <span class="material-icons text-sm">${c.var >= 0 ? 'arrow_drop_up' : 'arrow_drop_down'}</span>
            <span>${c.var >= 0 ? '+' : ''}${c.var.toFixed(2)}%</span>
          </div>
        </div>
      </div>
    `).join('');
  }

  renderClima() {
    const cardEl = document.getElementById('card-clima-principal');
    if (!cardEl) return;

    if (!this.weatherData || !this.weatherData.current) {
      cardEl.innerHTML = `
        <div class="p-6 text-center text-zinc-500">
          Carregando dados meteorológicos...
        </div>
      `;
      return;
    }

    const cur = this.weatherData.current;
    const daily = this.weatherData.daily;

    // Regra agrometeorológica para Pulverização
    // Vento ideal: entre 3 e 10 km/h. Precipitação = 0. Umidade relativa > 50%.
    let pulverizacaoStatus = 'Favorável';
    let pulverizacaoCor = 'bg-emerald-600 text-white';
    let pulverizacaoIcon = 'check_circle';
    let pulverizacaoMotivo = 'Vento e umidade ideais para absorção defensiva';

    if (cur.precipitation > 0 || (daily && daily.precipitation_probability_max[0] > 60)) {
      pulverizacaoStatus = 'Não Recomendado';
      pulverizacaoCor = 'bg-red-600 text-white';
      pulverizacaoIcon = 'cancel';
      pulverizacaoMotivo = 'Risco alto de lavagem pela chuva';
    } else if (cur.wind_speed_10m > 12) {
      pulverizacaoStatus = 'Atenção: Vento Forte';
      pulverizacaoCor = 'bg-[#F57F17] text-white';
      pulverizacaoIcon = 'warning';
      pulverizacaoMotivo = `Vento a ${cur.wind_speed_10m} km/h causa deriva de produto`;
    } else if (cur.wind_speed_10m < 2) {
      pulverizacaoStatus = 'Atenção: Inversão Térmica';
      pulverizacaoCor = 'bg-amber-600 text-white';
      pulverizacaoIcon = 'warning';
      pulverizacaoMotivo = 'Ar parado pode gerar gotas suspensas';
    }

    cardEl.innerHTML = `
      <div class="p-5 bg-gradient-to-br from-[#2E7D32] to-[#1B5E20] text-white rounded-3xl shadow-md">
        <div class="flex items-center justify-between">
          <div>
            <div class="flex items-center gap-2">
              <span class="material-icons text-amber-300">place</span>
              <h3 class="text-xl font-black">${this.selectedCity.nome}</h3>
            </div>
            <p class="text-xs text-emerald-200 mt-0.5">Previsão em Tempo Real (Open-Meteo Satélite)</p>
          </div>
          <div class="text-right">
            <span class="text-4xl font-black">${Math.round(cur.temperature_2m)}°C</span>
            <span class="text-xs text-emerald-200 block">Sensação ${Math.round(cur.apparent_temperature)}°C</span>
          </div>
        </div>

        <!-- Indicador de Pulverização -->
        <div class="mt-4 p-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="material-icons text-xl text-amber-300">${pulverizacaoIcon}</span>
            <div>
              <p class="text-xs text-emerald-100 font-bold uppercase tracking-wider">Janela de Pulverização</p>
              <p class="text-sm font-extrabold text-white">${pulverizacaoStatus}</p>
            </div>
          </div>
          <span class="text-xs text-emerald-200 text-right max-w-[160px]">${pulverizacaoMotivo}</span>
        </div>

        <!-- Métricas Rápidas -->
        <div class="grid grid-cols-3 gap-2 mt-4 text-center">
          <div class="p-2.5 rounded-xl bg-white/10 border border-white/10">
            <span class="material-icons text-emerald-200 text-lg">water_drop</span>
            <span class="text-xs block text-emerald-200 font-semibold">Umidade</span>
            <span class="text-base font-black">${cur.relative_humidity_2m}%</span>
          </div>
          <div class="p-2.5 rounded-xl bg-white/10 border border-white/10">
            <span class="material-icons text-emerald-200 text-lg">air</span>
            <span class="text-xs block text-emerald-200 font-semibold">Vento</span>
            <span class="text-base font-black">${cur.wind_speed_10m} km/h</span>
          </div>
          <div class="p-2.5 rounded-xl bg-white/10 border border-white/10">
            <span class="material-icons text-emerald-200 text-lg">cloud</span>
            <span class="text-xs block text-emerald-200 font-semibold">Chuva Hoje</span>
            <span class="text-base font-black">${daily ? daily.precipitation_sum[0] : 0} mm</span>
          </div>
        </div>
      </div>

      <!-- Próximos 5 Dias -->
      <div class="mt-4 bg-white p-4 rounded-2xl border-2 border-zinc-200 shadow-sm">
        <h4 class="font-black text-sm text-zinc-800 uppercase tracking-wider mb-3">Previsão dos Próximos 5 Dias</h4>
        <div class="divide-y divide-zinc-100">
          ${(daily?.time || []).slice(1, 6).map((dia, idx) => {
            const dataFormat = dia.split('-').reverse().slice(0, 2).join('/');
            const max = Math.round(daily.temperature_2m_max[idx + 1]);
            const min = Math.round(daily.temperature_2m_min[idx + 1]);
            const prob = daily.precipitation_probability_max[idx + 1];
            const chuva = daily.precipitation_sum[idx + 1];

            return `
              <div class="py-2.5 flex items-center justify-between text-sm">
                <span class="font-bold text-zinc-800 w-16">${dataFormat}</span>
                <div class="flex items-center gap-1.5 text-zinc-600">
                  <span class="text-xs font-extrabold text-blue-600 flex items-center gap-0.5">
                    <span class="material-icons text-sm">water_drop</span> ${prob}% (${chuva}mm)
                  </span>
                </div>
                <div class="text-right font-black">
                  <span class="text-zinc-900">${max}°</span>
                  <span class="text-zinc-400 font-normal"> / ${min}°</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }
}

// Inicializa a aplicação quando a página carregar
window.addEventListener('DOMContentLoaded', () => {
  window.harvesta = new HarvestaApp();
  window.harvesta.init();
});
