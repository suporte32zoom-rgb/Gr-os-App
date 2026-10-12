import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CATEGORY_COLORS, CategoryExpense, DespesasChart } from './despesas-chart';

export interface Safra {
  id: string;
  nome: string;
  culturaPrincipal: string;
  areaHectares: number;
  dataInicio: string;
  dataFim?: string;
  status: 'ativa' | 'finalizada';
}

export interface Lancamento {
  id: string;
  safraId: string;
  tipo: 'receita' | 'despesa';
  descricao: string;
  categoria: string;
  cultura: string;
  valor: number;
  data: string;
  observacao?: string;
}

export interface Cotacao {
  cultura: string;
  praca: string;
  valor: number;
  var: number;
  icon: string;
}

export interface PoloAgricola {
  nome: string;
  lat: number;
  lon: number;
}

export interface OpenMeteoWeather {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    precipitation: number;
    weather_code: number;
    wind_speed_10m: number;
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    precipitation_probability_max: number[];
  };
}

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

@Component({
  selector: 'app-root',
  imports: [CommonModule, MatIconModule, ReactiveFormsModule, DespesasChart],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App implements OnInit {
  private fb = inject(FormBuilder);

  // Polos agrícolas brasileiros de referência
  readonly polosAgricolas: PoloAgricola[] = [
    { nome: 'Rio Verde - GO', lat: -17.7925, lon: -50.9192 },
    { nome: 'Sorriso - MT', lat: -12.5442, lon: -55.7226 },
    { nome: 'Cascavel - PR', lat: -24.9578, lon: -53.4595 },
    { nome: 'Ribeirão Preto - SP', lat: -21.1775, lon: -47.8103 },
    { nome: 'Patrocínio - MG', lat: -18.9439, lon: -46.9928 },
    { nome: 'Barreiras - BA', lat: -12.1528, lon: -44.9961 },
    { nome: 'Chapecó - SC', lat: -27.1004, lon: -52.6152 },
    { nome: 'Passo Fundo - RS', lat: -28.2612, lon: -52.4083 },
    { nome: 'Balsas - MA', lat: -7.5322, lon: -46.0356 },
  ];

  // Estado Principal com Signals
  readonly activeTab = signal<'dashboard' | 'caderno' | 'calculadora' | 'clima'>('dashboard');
  readonly isOnline = signal<boolean>(true);
  readonly isInstallable = signal<boolean>(false);
  readonly isInstalled = signal<boolean>(false);
  readonly showIOSGuide = signal<boolean>(false);
  readonly showNovoLancamentoModal = signal<boolean>(false);
  readonly showNovaSafraModal = signal<boolean>(false);
  readonly showExportModal = signal<boolean>(false);
  readonly exportTab = signal<'index' | 'app' | 'sw' | 'manifest'>('index');

  // Notificação Toast
  readonly toast = signal<{ message: string; type: 'success' | 'warning' | 'error' | 'info' } | null>(null);

  // Safras e Lançamentos
  readonly safras = signal<Safra[]>([
    {
      id: 'safra-2024-25',
      nome: 'Safra Principal 2024/2025',
      culturaPrincipal: 'Soja',
      areaHectares: 45,
      dataInicio: '2024-10-01',
      status: 'ativa',
    },
    {
      id: 'safra-safrinha-24',
      nome: 'Safrinha Milho 2024',
      culturaPrincipal: 'Milho',
      areaHectares: 30,
      dataInicio: '2024-02-15',
      status: 'finalizada',
    },
  ]);

  readonly activeSafraId = signal<string>('safra-2024-25');

  readonly lancamentos = signal<Lancamento[]>([
    {
      id: 'lanc-01',
      safraId: 'safra-2024-25',
      tipo: 'despesa',
      descricao: 'Adubo NPK 04-14-08 (15 toneladas a granel)',
      categoria: 'Adubo & Fertilizante',
      cultura: 'Soja',
      valor: 42500,
      data: '2024-10-12',
      observacao: 'Comprado na cooperativa com prazo safra',
    },
    {
      id: 'lanc-02',
      safraId: 'safra-2024-25',
      tipo: 'despesa',
      descricao: 'Sementes Soja Intacta 2 PRO (60 sacos)',
      categoria: 'Sementes',
      cultura: 'Soja',
      valor: 26400,
      data: '2024-10-18',
      observacao: 'Taxa de germinação 94% testada',
    },
    {
      id: 'lanc-03',
      safraId: 'safra-2024-25',
      tipo: 'despesa',
      descricao: 'Óleo Diesel S10 (3.000 Litros)',
      categoria: 'Combustível & Óleo',
      cultura: 'Soja',
      valor: 17850,
      data: '2024-11-04',
      observacao: 'Abastecimento para trator e pulverizador',
    },
    {
      id: 'lanc-04',
      safraId: 'safra-2024-25',
      tipo: 'receita',
      descricao: 'Venda antecipada de Soja (500 sacas contrato futuro)',
      categoria: 'Venda de Colheita',
      cultura: 'Soja',
      valor: 68500,
      data: '2024-11-20',
      observacao: 'R$ 137,00 por saca entregue na cerealista',
    },
    {
      id: 'lanc-05',
      safraId: 'safra-2024-25',
      tipo: 'despesa',
      descricao: 'Manutenção preventiva do trator e plantadeira',
      categoria: 'Manutenção de Máquinas',
      cultura: 'Soja',
      valor: 5300,
      data: '2024-12-05',
      observacao: 'Revisão de bicos, rolamentos e correias',
    },
  ]);

  // Filtros do Caderno de Campo
  readonly filtroCultura = signal<string>('todas');
  readonly filtroTipo = signal<'todos' | 'receita' | 'despesa'>('todos');
  readonly filtroBusca = signal<string>('');

  // Parâmetros da Calculadora de Lucro
  readonly calcCustoTotal = signal<number>(92050);
  readonly calcExpectativaSacas = signal<number>(2700);
  readonly calcAreaHectares = signal<number>(45);
  readonly calcPrecoVendaSimulado = signal<number>(138.00);

  // Clima e Cotações
  readonly selectedCity = signal<PoloAgricola>(this.polosAgricolas[0]);
  readonly weatherData = signal<OpenMeteoWeather | null>(null);
  readonly weatherLoading = signal<boolean>(false);

  readonly cotacoes = signal<Cotacao[]>([
    { cultura: 'Soja (60kg)', praca: 'Paranaguá / Mercado Físico', valor: 137.50, var: 1.15, icon: 'eco' },
    { cultura: 'Milho (60kg)', praca: 'Campinas / Mercado Interno', valor: 64.20, var: -0.45, icon: 'grain' },
    { cultura: 'Café Arábica (60kg)', praca: 'Cerrado Mineiro / Tipo 6', valor: 1420.00, var: 0.85, icon: 'coffee' },
    { cultura: 'Boi Gordo (@ 15kg)', praca: 'São Paulo / Cepea', valor: 312.00, var: 0.32, icon: 'pets' },
    { cultura: 'Trigo (Tonelada)', praca: 'Paraná / Físico', valor: 1280.00, var: -0.10, icon: 'grass' },
    { cultura: 'Leite (Litro)', praca: 'Média Brasil ao Produtor', valor: 2.68, var: 0.75, icon: 'water_drop' },
    { cultura: 'Dólar Comercial', praca: 'PTAX / Câmbio', valor: 5.64, var: -0.28, icon: 'attach_money' },
  ]);

  // Formulários Reativos
  readonly lancamentoForm = this.fb.group({
    tipo: ['despesa' as 'receita' | 'despesa', Validators.required],
    descricao: ['', [Validators.required, Validators.minLength(3)]],
    categoria: ['Adubo & Fertilizante', Validators.required],
    cultura: ['Soja', Validators.required],
    valor: [0, [Validators.required, Validators.min(0.01)]],
    data: [new Date().toISOString().split('T')[0], Validators.required],
    observacao: [''],
  });

  readonly safraForm = this.fb.group({
    nome: ['', [Validators.required, Validators.minLength(3)]],
    culturaPrincipal: ['Soja', Validators.required],
    areaHectares: [50, [Validators.required, Validators.min(0.1)]],
  });

  // Prompt de Instalação PWA
  private deferredPrompt: BeforeInstallPromptEvent | null = null;

  // DERIVADOS COMPUTADOS
  readonly activeSafra = computed(() => {
    return this.safras().find((s) => s.id === this.activeSafraId()) || this.safras()[0];
  });

  readonly lancamentosDaSafra = computed(() => {
    const id = this.activeSafraId();
    return this.lancamentos().filter((l) => l.safraId === id);
  });

  readonly receitaTotal = computed(() => {
    return this.lancamentosDaSafra()
      .filter((l) => l.tipo === 'receita')
      .reduce((sum, item) => sum + (Number(item.valor) || 0), 0);
  });

  readonly despesaTotal = computed(() => {
    return this.lancamentosDaSafra()
      .filter((l) => l.tipo === 'despesa')
      .reduce((sum, item) => sum + (Number(item.valor) || 0), 0);
  });

  readonly saldoEstimado = computed(() => {
    return this.receitaTotal() - this.despesaTotal();
  });

  readonly margemBrutaPercentual = computed(() => {
    const rec = this.receitaTotal();
    if (rec <= 0) return 0;
    return (this.saldoEstimado() / rec) * 100;
  });

  readonly custoPorHectare = computed(() => {
    const safra = this.activeSafra();
    if (!safra || safra.areaHectares <= 0) return 0;
    return this.despesaTotal() / safra.areaHectares;
  });

  // Distribuição percentual de despesas por categoria de insumo
  readonly despesasPorCategoria = computed<CategoryExpense[]>(() => {
    const desp = this.lancamentosDaSafra().filter((l) => l.tipo === 'despesa');
    const total = this.despesaTotal();
    if (total <= 0 || desp.length === 0) return [];

    const map = new Map<string, number>();
    for (const item of desp) {
      const cat = item.categoria || 'Outros';
      map.set(cat, (map.get(cat) || 0) + (Number(item.valor) || 0));
    }

    const result: CategoryExpense[] = [];
    for (const [cat, val] of map.entries()) {
      const config = CATEGORY_COLORS[cat] || { color: '#795548', icon: 'category' };
      result.push({
        name: cat,
        value: val,
        percentage: (val / total) * 100,
        color: config.color,
        icon: config.icon,
      });
    }

    return result.sort((a, b) => b.value - a.value);
  });

  // Lançamentos filtrados para o caderno
  readonly lancamentosFiltrados = computed(() => {
    let items = this.lancamentosDaSafra();
    const cultura = this.filtroCultura();
    const tipo = this.filtroTipo();
    const busca = this.filtroBusca().toLowerCase().trim();

    if (cultura !== 'todas') {
      items = items.filter((l) => l.cultura.toLowerCase() === cultura.toLowerCase());
    }

    if (tipo !== 'todos') {
      items = items.filter((l) => l.tipo === tipo);
    }

    if (busca) {
      items = items.filter((l) =>
        l.descricao.toLowerCase().includes(busca) ||
        l.categoria.toLowerCase().includes(busca) ||
        (l.observacao && l.observacao.toLowerCase().includes(busca))
      );
    }

    return items;
  });

  // Cálculos da Calculadora de Lucro
  readonly custoMinimoPorSaca = computed(() => {
    const sacas = this.calcExpectativaSacas();
    const custo = this.calcCustoTotal();
    if (sacas <= 0) return 0;
    return custo / sacas;
  });

  readonly lucroPorSaca = computed(() => {
    return this.calcPrecoVendaSimulado() - this.custoMinimoPorSaca();
  });

  readonly margemLucroPercentual = computed(() => {
    const preco = this.calcPrecoVendaSimulado();
    if (preco <= 0) return 0;
    return (this.lucroPorSaca() / preco) * 100;
  });

  readonly lucroTotalSimulado = computed(() => {
    return this.lucroPorSaca() * this.calcExpectativaSacas();
  });

  readonly produtividadeScHa = computed(() => {
    const ha = this.calcAreaHectares();
    if (ha <= 0) return 0;
    return this.calcExpectativaSacas() / ha;
  });

  readonly lucroPorHectareSimulado = computed(() => {
    const ha = this.calcAreaHectares();
    if (ha <= 0) return 0;
    return this.lucroTotalSimulado() / ha;
  });

  // Análise agrometeorológica inteligente de pulverização
  readonly analisePulverizacao = computed(() => {
    const w = this.weatherData();
    if (!w || !w.current) {
      return {
        status: 'Aguardando clima',
        cor: 'bg-zinc-600 text-white',
        icon: 'hourglass_empty',
        motivo: 'Carregando dados de satélite da lavoura...',
      };
    }

    const cur = w.current;
    const daily = w.daily;

    if (cur.precipitation > 0 || (daily && daily.precipitation_probability_max[0] > 60)) {
      return {
        status: 'Não Recomendado',
        cor: 'bg-red-600 text-white',
        icon: 'cancel',
        motivo: 'Chuva iminente lava as gotas do defensivo.',
      };
    } else if (cur.wind_speed_10m > 12) {
      return {
        status: 'Atenção: Vento Forte',
        cor: 'bg-[#F57F17] text-white',
        icon: 'warning',
        motivo: `Vento de ${cur.wind_speed_10m} km/h causa deriva nas folhas vizinhas.`,
      };
    } else if (cur.wind_speed_10m < 2) {
      return {
        status: 'Atenção: Inversão Térmica',
        cor: 'bg-amber-600 text-white',
        icon: 'warning',
        motivo: 'Ar parado retém névoa suspensa e pode queimar folhas.',
      };
    }

    return {
      status: 'Janela Favorável',
      cor: 'bg-emerald-600 text-white',
      icon: 'check_circle',
      motivo: `Vento ${cur.wind_speed_10m} km/h e umidade ${cur.relative_humidity_2m}% ideais para absorção.`,
    };
  });

  ngOnInit() {
    this.carregarDadosLocais();
    this.iniciarServiceWorker();
    this.escutarConexao();
    this.escutarInstalacaoPWA();
    this.buscarClima();
    this.buscarDolarAoVivo();
  }

  // Persistência Offline
  private carregarDadosLocais() {
    if (typeof window === 'undefined') return;
    try {
      const safrasSalvas = localStorage.getItem('harvesta_safras_v1');
      if (safrasSalvas) this.safras.set(JSON.parse(safrasSalvas));

      const activeId = localStorage.getItem('harvesta_active_safra_id_v1');
      if (activeId) this.activeSafraId.set(activeId);

      const lancSalvos = localStorage.getItem('harvesta_lancamentos_v1');
      if (lancSalvos) this.lancamentos.set(JSON.parse(lancSalvos));

      const climaSalvo = localStorage.getItem('harvesta_weather_cache_v1');
      if (climaSalvo) this.weatherData.set(JSON.parse(climaSalvo));

      // Sincroniza calculadora com a safra ativa
      this.sincronizarCalculadoraComSafra();
    } catch (e) {
      console.warn('Falha ao restaurar dados do localStorage:', e);
    }
  }

  private salvarDadosLocais() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('harvesta_safras_v1', JSON.stringify(this.safras()));
      localStorage.setItem('harvesta_active_safra_id_v1', this.activeSafraId());
      localStorage.setItem('harvesta_lancamentos_v1', JSON.stringify(this.lancamentos()));
    } catch (e) {
      console.warn('Erro ao salvar no localStorage:', e);
    }
  }

  // PWA Service Worker
  private iniciarServiceWorker() {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => console.log('Harvesta SW registrado com sucesso:', reg.scope))
        .catch((err) => console.warn('Erro ao registrar Service Worker:', err));
    }
  }

  // Status de Rede Online / Offline
  private escutarConexao() {
    if (typeof window === 'undefined') return;
    this.isOnline.set(navigator.onLine);

    window.addEventListener('online', () => {
      this.isOnline.set(true);
      this.mostrarToast('Conexão restabelecida! Atualizando cotações...', 'success');
      this.buscarClima();
      this.buscarDolarAoVivo();
    });

    window.addEventListener('offline', () => {
      this.isOnline.set(false);
      this.mostrarToast('Sem sinal na lavoura. Modo Offline ativo!', 'warning');
    });
  }

  // Evento de Instalação PWA
  private escutarInstalacaoPWA() {
    if (typeof window === 'undefined') return;

    // Detecta se já está instalado em modo standalone
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    this.isInstalled.set(isStandalone);

    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      this.isInstallable.set(true);
    });

    window.addEventListener('appinstalled', () => {
      this.isInstalled.set(true);
      this.isInstallable.set(false);
      this.deferredPrompt = null;
      this.mostrarToast('Harvesta instalado com sucesso no seu dispositivo!', 'success');
    });
  }

  instalarPWA() {
    if (!this.deferredPrompt) {
      // Abre guia para iOS Safari
      this.showIOSGuide.set(true);
      return;
    }
    this.deferredPrompt.prompt();
    this.deferredPrompt.userChoice.then((choice: { outcome: 'accepted' | 'dismissed' }) => {
      if (choice.outcome === 'accepted') {
        this.isInstalled.set(true);
      }
      this.deferredPrompt = null;
      this.isInstallable.set(false);
    });
  }

  // Clima via Open-Meteo
  async buscarClima() {
    const polo = this.selectedCity();
    this.weatherLoading.set(true);
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${polo.lat}&longitude=${polo.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&timezone=America%2FSao_Paulo`;

    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        this.weatherData.set(data);
        if (typeof window !== 'undefined') {
          localStorage.setItem('harvesta_weather_cache_v1', JSON.stringify(data));
        }
      }
    } catch (e) {
      console.warn('Erro ao buscar clima online, usando dados de cache se disponíveis:', e);
    } finally {
      this.weatherLoading.set(false);
    }
  }

  usarGps() {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      this.mostrarToast('Geolocalização não disponível.', 'error');
      return;
    }

    this.mostrarToast('Obtendo coordenadas do talhão via GPS...', 'info');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.selectedCity.set({
          nome: 'Minha Lavoura (GPS)',
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        });
        this.mostrarToast('Coordenadas da roça sincronizadas!', 'success');
        this.buscarClima();
      },
      (err) => {
        console.warn('Erro ao obter GPS:', err);
        this.mostrarToast('Permissão de GPS negada ou sinal fraco.', 'warning');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }

  // Cotação do Dólar
  async buscarDolarAoVivo() {
    if (typeof window === 'undefined' || !navigator.onLine) return;
    try {
      const res = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL');
      if (res.ok) {
        const data = await res.json();
        if (data && data.USDBRL) {
          const bid = parseFloat(data.USDBRL.bid);
          const pct = parseFloat(data.USDBRL.pctChange);
          this.cotacoes.update((list) =>
            list.map((c) =>
              c.cultura.includes('Dólar') ? { ...c, valor: bid, var: pct } : c
            )
          );
        }
      }
    } catch (e) {
      console.warn('Não foi possível obter cotação de dólar:', e);
    }
  }

  // Ações de Safra e Lançamentos
  trocarSafra(safraId: string) {
    this.activeSafraId.set(safraId);
    this.salvarDadosLocais();
    this.sincronizarCalculadoraComSafra();
  }

  sincronizarCalculadoraComSafra() {
    const desp = this.despesaTotal();
    const safra = this.activeSafra();
    if (desp > 0) this.calcCustoTotal.set(desp);
    if (safra && safra.areaHectares > 0) this.calcAreaHectares.set(safra.areaHectares);
  }

  salvarNovoLancamento() {
    if (this.lancamentoForm.invalid) {
      this.mostrarToast('Preencha os campos obrigatórios corretamente.', 'warning');
      return;
    }

    const fv = this.lancamentoForm.value;
    const novo: Lancamento = {
      id: 'lanc-' + Date.now(),
      safraId: this.activeSafraId(),
      tipo: fv.tipo || 'despesa',
      descricao: fv.descricao || '',
      categoria: fv.categoria || 'Outros',
      cultura: fv.cultura || 'Soja',
      valor: Number(fv.valor) || 0,
      data: fv.data || new Date().toISOString().split('T')[0],
      observacao: fv.observacao || '',
    };

    this.lancamentos.update((prev) => [novo, ...prev]);
    this.salvarDadosLocais();
    this.sincronizarCalculadoraComSafra();
    this.showNovoLancamentoModal.set(false);
    this.lancamentoForm.patchValue({
      descricao: '',
      valor: 0,
      observacao: '',
    });
    this.mostrarToast(`${novo.tipo === 'receita' ? 'Entrada' : 'Despesa'} registrada com sucesso!`, 'success');
  }

  excluirLancamento(id: string) {
    this.lancamentos.update((prev) => prev.filter((l) => l.id !== id));
    this.salvarDadosLocais();
    this.sincronizarCalculadoraComSafra();
    this.mostrarToast('Registro removido do caderno.', 'info');
  }

  salvarNovaSafra() {
    if (this.safraForm.invalid) {
      this.mostrarToast('Informe o nome e os hectares da safra.', 'warning');
      return;
    }

    const fv = this.safraForm.value;
    const nova: Safra = {
      id: 'safra-' + Date.now(),
      nome: fv.nome || 'Nova Safra',
      culturaPrincipal: fv.culturaPrincipal || 'Soja',
      areaHectares: Number(fv.areaHectares) || 10,
      dataInicio: new Date().toISOString().split('T')[0],
      status: 'ativa',
    };

    this.safras.update((prev) => [nova, ...prev]);
    this.activeSafraId.set(nova.id);
    this.salvarDadosLocais();
    this.showNovaSafraModal.set(false);
    this.safraForm.reset({
      nome: '',
      culturaPrincipal: 'Soja',
      areaHectares: 50,
    });
    this.mostrarToast(`Safra "${nova.nome}" criada e ativada!`, 'success');
  }

  // Exportações
  exportarPlanilhaCsv() {
    const items = this.lancamentosDaSafra();
    let csv = 'Data,Tipo,Cultura,Categoria,Descricao,Valor,Observacao\n';
    items.forEach((l) => {
      csv += `"${l.data}","${l.tipo}","${l.cultura}","${l.categoria}","${l.descricao.replace(/"/g, '""')}","${l.valor}","${(l.observacao || '').replace(/"/g, '""')}"\n`;
    });
    this.baixarArquivo(`harvesta_${this.activeSafra().nome.replace(/\s+/g, '_')}_caderno.csv`, csv, 'text/csv');
    this.mostrarToast('Planilha CSV pronta para download!', 'success');
  }

  exportarBackupJson() {
    const backup = {
      app: 'Harvesta Agro PWA',
      versao: '1.0.0',
      dataExportacao: new Date().toISOString(),
      safras: this.safras(),
      lancamentos: this.lancamentos(),
    };
    this.baixarArquivo(`harvesta_backup_${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(backup, null, 2), 'application/json');
    this.mostrarToast('Backup completo salvo com sucesso!', 'success');
  }

  baixarArquivo(nome: string, conteudo: string, mime: string) {
    if (typeof window === 'undefined') return;
    const blob = new Blob([conteudo], { type: `${mime};charset=utf-8;` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nome;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  copiarTexto(texto: string, label: string) {
    if (typeof window === 'undefined') return;
    navigator.clipboard.writeText(texto).then(() => {
      this.mostrarToast(`Código de ${label} copiado para a área de transferência!`, 'success');
    });
  }

  mostrarToast(message: string, type: 'success' | 'warning' | 'error' | 'info') {
    this.toast.set({ message, type });
    setTimeout(() => {
      this.toast.set(null);
    }, 4000);
  }

  // Formatação de Valores
  formatarMoeda(val: number): string {
    return (Number(val) || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  }

  // Predefinições da Calculadora de Lucro
  aplicarPrecoCenario(multiplicador: number) {
    const custoMin = this.custoMinimoPorSaca();
    const novoPreco = Math.round(custoMin * multiplicador * 10) / 10;
    this.calcPrecoVendaSimulado.set(novoPreco);
  }
}
