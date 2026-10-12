import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  OnChanges,
  OnDestroy,
  PLATFORM_ID,
  viewChild,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

export interface CategoryExpense {
  name: string;
  value: number;
  percentage: number;
  color: string;
  icon: string;
}

const CATEGORY_COLORS: Record<string, { color: string; icon: string }> = {
  'Adubo & Fertilizante': { color: '#2E7D32', icon: 'compost' },
  'Sementes': { color: '#F57F17', icon: 'grain' },
  'Combustível & Óleo': { color: '#E65100', icon: 'local_gas_station' },
  'Defensivos': { color: '#00897B', icon: 'pest_control' },
  'Mão de Obra': { color: '#5E35B1', icon: 'engineering' },
  'Manutenção de Máquinas': { color: '#455A64', icon: 'build' },
  'Outros': { color: '#795548', icon: 'category' },
};

@Component({
  selector: 'app-despesas-chart',
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-white rounded-3xl p-5 border-2 border-zinc-200 shadow-sm space-y-4">
      <div class="flex items-center justify-between pb-2 border-b border-zinc-100">
        <div>
          <h3 class="text-base font-black text-zinc-900 flex items-center gap-1.5">
            <mat-icon class="text-[#2E7D32]">pie_chart</mat-icon>
            <span>Distribuição de Custos por Categoria</span>
          </h3>
          <p class="text-xs text-zinc-500 font-semibold mt-0.5">
            Composição percentual dos insumos na safra ativa
          </p>
        </div>
        <span class="text-xs font-black px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-700">
          Recharts
        </span>
      </div>

      @if (data().length === 0) {
        <div class="p-8 text-center text-zinc-400">
          <mat-icon class="text-4xl text-zinc-300">donut_large</mat-icon>
          <p class="mt-2 text-sm font-bold text-zinc-600">Nenhum custo registrado para gerar o gráfico</p>
          <p class="text-xs text-zinc-400">Adicione despesas de adubo, sementes ou diesel no caderno.</p>
        </div>
      } @else {
        <!-- Container Recharts React -->
        <div class="w-full h-64 sm:h-72" #chartContainer></div>

        <!-- Grade de Legenda e Indicadores Percentuais Táteis -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-zinc-100">
          @for (item of data(); track item.name) {
            <div class="p-2.5 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span
                  class="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                  [style.background-color]="item.color"
                ></span>
                <div>
                  <p class="text-xs font-black text-zinc-800 leading-tight">{{ item.name }}</p>
                  <p class="text-[11px] font-bold text-zinc-500">{{ formatarMoeda(item.value) }}</p>
                </div>
              </div>
              <div class="text-right">
                <span
                  class="text-xs font-black px-2 py-0.5 rounded-md text-white shadow-2xs"
                  [style.background-color]="item.color"
                >
                  {{ item.percentage.toFixed(1) }}%
                </span>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class DespesasChart implements AfterViewInit, OnChanges, OnDestroy {
  readonly data = input<CategoryExpense[]>([]);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly chartContainer = viewChild<ElementRef<HTMLDivElement>>('chartContainer');

  private reactRoot: Root | null = null;

  ngAfterViewInit() {
    this.renderRecharts();
  }

  ngOnChanges() {
    this.renderRecharts();
  }

  private renderRecharts() {
    if (!isPlatformBrowser(this.platformId)) return;

    const containerEl = this.chartContainer()?.nativeElement;
    if (!containerEl) return;

    const chartData = this.data();
    if (chartData.length === 0) {
      if (this.reactRoot) {
        this.reactRoot.unmount();
        this.reactRoot = null;
      }
      return;
    }

    if (!this.reactRoot) {
      this.reactRoot = createRoot(containerEl);
    }

    // Custom Tooltip Formatter
    interface TooltipPayloadItem {
      payload: CategoryExpense;
    }

    interface CustomTooltipProps {
      active?: boolean;
      payload?: TooltipPayloadItem[];
    }

    const CustomTooltip = (props: CustomTooltipProps) => {
      if (props.active && props.payload && props.payload.length) {
        const item = props.payload[0].payload;
        return React.createElement(
          'div',
          {
            style: {
              backgroundColor: '#1E293B',
              color: '#FFFFFF',
              padding: '8px 12px',
              borderRadius: '12px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)',
              fontSize: '12px',
              fontWeight: 700,
            },
          },
          React.createElement('div', { style: { color: item.color, fontWeight: 900 } }, item.name),
          React.createElement(
            'div',
            { style: { marginTop: '2px', color: '#E2E8F0' } },
            `Total: R$ ${item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
          ),
          React.createElement(
            'div',
            { style: { color: '#FCD34D', fontWeight: 800 } },
            `Participação: ${item.percentage.toFixed(1)}%`
          )
        );
      }
      return null;
    };

    // Monta o elemento React com Recharts PieChart (Donut)
    const pieCells = chartData.map((entry, index) =>
      React.createElement(Cell as React.ComponentType<Record<string, unknown>>, {
        key: `cell-${index}`,
        fill: entry.color,
        stroke: '#FFFFFF',
        strokeWidth: 2,
      })
    );

    const pieElement = React.createElement(
      Pie as React.ComponentType<Record<string, unknown>>,
      {
        data: chartData,
        dataKey: 'value',
        nameKey: 'name',
        cx: '50%',
        cy: '50%',
        innerRadius: '48%',
        outerRadius: '78%',
        paddingAngle: 4,
        isAnimationActive: true,
        animationDuration: 800,
        children: pieCells,
      }
    );

    const tooltipElement = React.createElement(Tooltip as React.ComponentType<Record<string, unknown>>, {
      content: CustomTooltip,
    });

    const pieChartElement = React.createElement(
      PieChart as React.ComponentType<Record<string, unknown>>,
      {
        children: [pieElement, tooltipElement],
      }
    );

    const element = React.createElement(
      ResponsiveContainer as React.ComponentType<{
        width: string | number;
        height: string | number;
        children?: React.ReactNode;
      }>,
      {
        width: '100%',
        height: '100%',
        children: pieChartElement,
      }
    );

    this.reactRoot.render(element);
  }

  formatarMoeda(val: number): string {
    return (Number(val) || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  }

  ngOnDestroy() {
    if (this.reactRoot) {
      this.reactRoot.unmount();
      this.reactRoot = null;
    }
  }
}

export { CATEGORY_COLORS };
