import { useMemo, useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Truck, TrendingUp, Users, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface VeiculoInfo {
  placa: string;
  modelo: string;
  capacidade: number;
}

interface OcupacaoData {
  veiculo: string;
  placa: string;
  capacidade: number;
  viagens: number;
  totalPax: number;
  ocupacaoMedia: number;
}

const DashboardOcupacao = () => {
  const [items, setItems] = useState<any[]>([]);
  const [veiculos, setVeiculos] = useState<VeiculoInfo[]>([]);

  useEffect(() => {
    Promise.all([
      supabase.from("agenda_items").select("*"),
      supabase.from("veiculos").select("placa, modelo, capacidade"),
    ]).then(([agendaRes, veiculosRes]) => {
      if (agendaRes.data) setItems(agendaRes.data);
      if (veiculosRes.data) setVeiculos(veiculosRes.data as VeiculoInfo[]);
    });
  }, []);

  const dados = useMemo(() => {
    const veiculoMap = new Map<string, VeiculoInfo>();
    veiculos.forEach((v) => veiculoMap.set(v.placa, v));

    const map = new Map<string, OcupacaoData>();
    items.forEach((item) => {
      const key = item.placa;
      const vInfo = veiculoMap.get(key);
      const capacidade = vInfo?.capacidade || 0;
      const existing = map.get(key) || {
        veiculo: item.veiculo,
        placa: item.placa,
        capacidade,
        viagens: 0,
        totalPax: 0,
        ocupacaoMedia: 0,
      };
      existing.viagens += 1;
      existing.totalPax += Number(item.pax);
      map.set(key, existing);
    });

    return Array.from(map.values())
      .map((d) => ({
        ...d,
        ocupacaoMedia: d.capacidade > 0 && d.viagens > 0
          ? (d.totalPax / (d.capacidade * d.viagens)) * 100
          : 0,
      }))
      .sort((a, b) => b.ocupacaoMedia - a.ocupacaoMedia);
  }, [items, veiculos]);

  const mediaGeral = dados.length > 0
    ? dados.reduce((s, d) => s + d.ocupacaoMedia, 0) / dados.length
    : 0;
  const totalViagens = dados.reduce((s, d) => s + d.viagens, 0);
  const totalPax = dados.reduce((s, d) => s + d.totalPax, 0);

  const getOcupacaoColor = (pct: number) => {
    if (pct >= 80) return "hsl(var(--accent))";
    if (pct >= 50) return "hsl(var(--primary))";
    if (pct >= 30) return "hsl(var(--muted-foreground))";
    return "hsl(var(--destructive, 0 84% 60%))";
  };

  const chartData = dados.slice(0, 15).map((d) => ({
    name: `${d.veiculo} (${d.placa})`,
    ocupacao: Math.round(d.ocupacaoMedia),
  }));

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={<Truck className="h-4 w-4" />} label="Veículos" value={dados.length.toString()} />
        <StatCard icon={<Calendar className="h-4 w-4" />} label="Total Viagens" value={totalViagens.toString()} />
        <StatCard icon={<Users className="h-4 w-4" />} label="Total PAX" value={totalPax.toString()} />
        <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Ocupação Média" value={`${mediaGeral.toFixed(1)}%`} accent />
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Taxa de Ocupação por Veículo</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 120, right: 20, top: 5, bottom: 5 }}>
                <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} fontSize={12} />
                <YAxis type="category" dataKey="name" fontSize={11} width={110} />
                <Tooltip formatter={(value: number) => [`${value}%`, "Ocupação"]} />
                <Bar dataKey="ocupacao" radius={[0, 4, 4, 0]} maxBarSize={24}>
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={getOcupacaoColor(entry.ocupacao)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-auto rounded-lg border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="font-semibold">Veículo</TableHead>
              <TableHead className="font-semibold">Placa</TableHead>
              <TableHead className="font-semibold text-center">Capacidade</TableHead>
              <TableHead className="font-semibold text-center">Viagens</TableHead>
              <TableHead className="font-semibold text-center">Total PAX</TableHead>
              <TableHead className="font-semibold text-center">Média PAX/Viagem</TableHead>
              <TableHead className="font-semibold min-w-[180px]">Ocupação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dados.map((d) => (
              <TableRow key={d.placa} className="transition-colors hover:bg-primary/5">
                <TableCell className="font-medium">
                  <span className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    {d.veiculo}
                  </span>
                </TableCell>
                <TableCell className="font-mono text-sm">{d.placa}</TableCell>
                <TableCell className="text-center">{d.capacidade || "—"}</TableCell>
                <TableCell className="text-center">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {d.viagens}
                  </span>
                </TableCell>
                <TableCell className="text-center">{d.totalPax}</TableCell>
                <TableCell className="text-center font-mono text-sm">
                  {d.viagens > 0 ? (d.totalPax / d.viagens).toFixed(1) : "0"}
                </TableCell>
                <TableCell>
                  {d.capacidade > 0 ? (
                    <div className="flex items-center gap-2">
                      <Progress value={Math.min(d.ocupacaoMedia, 100)} className="h-2 flex-1" />
                      <span className="min-w-[40px] text-right font-mono text-xs font-semibold">
                        {d.ocupacaoMedia.toFixed(1)}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Sem cadastro</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {dados.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Nenhum dado encontrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) => (
  <div className="rounded-lg border border-border bg-card p-3 shadow-sm">
    <div className="flex items-center gap-1.5 text-muted-foreground">
      {icon}
      <p className="text-xs font-medium">{label}</p>
    </div>
    <p className={`mt-1 text-lg font-bold ${accent ? "text-accent" : "text-foreground"}`}>{value}</p>
  </div>
);

export default DashboardOcupacao;
