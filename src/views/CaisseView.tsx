import { useEffect, useMemo, useState } from 'react';
import {
  Wallet, Lock, LockOpen, ArrowDownLeft, ArrowUpRight, Plus, Loader2,
  AlertTriangle, CheckCircle2, History, X, CreditCard, Banknote, RotateCcw,
  Droplet, User, Clock, ChevronRight, ShieldCheck,
} from 'lucide-react';
import {
  useCaisse, MOVEMENT_REASONS,
  type CaisseEntry, type CashSession, type CashMovementReason, type CashMovementType,
} from '../stores/useCaisse';
import { formatSalonTime, formatSalonDayLabel } from '../lib/time';
import { api } from '../lib/api';

const REASON_LABEL: Record<CashMovementReason, string> = {
  apport: 'Apport de monnaie',
  retrait: 'Prélèvement',
  achat: 'Achat réglé du tiroir',
  avance: 'Avance sur salaire',
  autre: 'Autre',
};

const KIND_ICON: Record<CaisseEntry['kind'], React.ElementType> = {
  opening: LockOpen,
  sale: Banknote,
  refund: RotateCcw,
  movement: ArrowUpRight,
  closing: Lock,
};

/** TND = 3 décimales (millimes), espace fine comme séparateur de milliers. */
function money(n: number): string {
  const sign = n < 0 ? '−' : '';
  return `${sign}${Math.abs(n).toFixed(3).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}`;
}

export function CaisseView() {
  const { day, session, totals, entries, canClose, loading, busy, error, history } = useCaisse();
  const [modal, setModal] = useState<null | 'open' | 'movement' | 'close'>(null);
  const [showHistory, setShowHistory] = useState(false);
  // LC-9 (Prompt 7) : appointmentId d'une ligne de Caisse cliquée — ouvre le modal d'investigation.
  const [investigateApptId, setInvestigateApptId] = useState<string | null>(null);

  useEffect(() => {
    useCaisse.getState().load();
    useCaisse.getState().loadHistory();
  }, []);

  const status = session?.status ?? 'none';
  const isOpen = status === 'open';

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4 shrink-0 border-b border-line">
        <div>
          <h1 className="text-base font-semibold flex items-center gap-2">
            <Wallet size={16} className="text-accent" /> Caisse
          </h1>
          <p className="text-xs text-muted mt-0.5">{formatSalonDayLabel(day)}</p>
        </div>

        <div className="flex items-center gap-2">
          <StatusPill status={status} />
          <button
            onClick={() => setShowHistory((v) => !v)}
            className={[
              'flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-colors',
              showHistory ? 'bg-surface border-accent/40 text-accent' : 'bg-surface border-line text-muted hover:text-ink',
            ].join(' ')}
          >
            <History size={12} /> Historique
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 flex items-start gap-2 text-xs text-error bg-error/10 border border-error/30 rounded-xl px-3 py-2.5">
          <AlertTriangle size={13} className="shrink-0 mt-px" />
          <span className="flex-1">{error}</span>
          <button onClick={() => useCaisse.getState().clearError()} className="shrink-0 hover:text-ink">
            <X size={12} />
          </button>
        </div>
      )}

      <div className="flex-1 overflow-hidden flex">

        {/* ── Colonne gauche : état du tiroir ───────────────── */}
        <div className="w-[360px] shrink-0 border-r border-line overflow-y-auto p-6 space-y-4">

          {loading ? (
            <div className="bg-surface rounded-2xl h-64 animate-pulse" />
          ) : status === 'none' ? (
            <div className="bg-surface rounded-2xl p-6 text-center">
              <Wallet size={28} className="text-muted mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-sm font-medium mb-1">Caisse non ouverte</p>
              <p className="text-xs text-muted mb-5 leading-relaxed">
                Comptez le fond de caisse et ouvrez la journée pour suivre les espèces.
              </p>
              <button
                onClick={() => setModal('open')}
                className="w-full py-2.5 rounded-xl bg-accent text-bg text-sm font-bold hover:bg-amber-400 active:scale-[0.98] transition-all"
              >
                Ouvrir la caisse
              </button>
            </div>
          ) : (
            <>
              <div className="bg-surface rounded-2xl p-5">
                <div className="text-xs text-muted mb-1">Espèces en caisse (théorique)</div>
                <div className="font-mono text-3xl font-bold leading-none text-accent mb-4">
                  {money(totals.expectedCash)} <span className="text-sm font-normal text-muted">TND</span>
                </div>

                <div className="space-y-2 pt-4 border-t border-line">
                  <Line label="Fond de caisse" value={totals.openingFloat} />
                  <Line label="Ventes espèces" value={totals.cashSales} positive />
                  {totals.cashRefunds > 0 && <Line label="Remboursements" value={-totals.cashRefunds} />}
                  {totals.cashIn > 0 && <Line label="Entrées manuelles" value={totals.cashIn} positive />}
                  {totals.cashOut > 0 && <Line label="Sorties manuelles" value={-totals.cashOut} />}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <MiniStat icon={CreditCard} label="Encaissé carte" value={money(totals.cardSales)} />
                <MiniStat icon={Banknote} label="Tickets du jour" value={String(totals.ticketCount)} raw />
              </div>

              {totals.cashTips > 0 && (
                <p className="text-[11px] text-muted leading-relaxed px-1">
                  {money(totals.cashTips)} TND de pourboires espèces ne sont pas comptés dans le théorique
                  (ils reviennent au staff).
                </p>
              )}

              {isOpen ? (
                <div className="space-y-2">
                  <button
                    onClick={() => setModal('movement')}
                    className="w-full py-2.5 rounded-xl bg-surface border border-line text-sm font-medium hover:border-accent/40 transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus size={14} /> Mouvement d'espèces
                  </button>
                  <button
                    onClick={() => setModal('close')}
                    disabled={!canClose}
                    title={canClose ? undefined : 'Seul un manager ou le propriétaire peut clôturer'}
                    className="w-full py-2.5 rounded-xl bg-accent text-bg text-sm font-bold hover:bg-amber-400 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:bg-surface disabled:text-muted disabled:cursor-not-allowed disabled:active:scale-100"
                  >
                    <Lock size={14} /> Clôturer la journée
                  </button>
                  {!canClose && (
                    <p className="text-[11px] text-muted text-center">
                      La clôture demande une session manager.
                    </p>
                  )}
                </div>
              ) : (
                <ClosedSummary
                  counted={session?.countedTotal ?? 0}
                  expected={session?.expectedTotal ?? 0}
                  variance={session?.variance ?? 0}
                  closedAt={session?.closedAt}
                  note={session?.closingNote}
                />
              )}
            </>
          )}
        </div>

        {/* ── Colonne droite : journal ou historique ────────── */}
        <div className="flex-1 overflow-y-auto">
          {showHistory ? (
            <HistoryPanel history={history} />
          ) : (
            <JournalPanel entries={entries} loading={loading} onInvestigate={setInvestigateApptId} />
          )}
        </div>
      </div>

      {modal === 'open' && <OpenModal busy={busy} onClose={() => setModal(null)} />}
      {modal === 'movement' && <MovementModal busy={busy} onClose={() => setModal(null)} />}
      {modal === 'close' && (
        <CloseModal busy={busy} expected={totals.expectedCash} onClose={() => setModal(null)} />
      )}
      {investigateApptId && (
        <InvestigationModal appointmentId={investigateApptId} onClose={() => setInvestigateApptId(null)} />
      )}
    </div>
  );
}

// ─── Sous-composants ────────────────────────────────────────────────────────

function StatusPill({ status }: { status: 'none' | 'open' | 'closed' }) {
  const map = {
    none:   { label: 'Non ouverte', cls: 'bg-surface text-muted border-line' },
    open:   { label: 'Ouverte',     cls: 'bg-success/10 text-success border-success/30' },
    closed: { label: 'Clôturée',    cls: 'bg-surface text-muted border-line' },
  }[status];
  return (
    <span className={`px-3 py-1.5 rounded-full border text-[11px] font-semibold ${map.cls}`}>
      {map.label}
    </span>
  );
}

function Line({ label, value, positive }: { label: string; value: number; positive?: boolean }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-muted">{label}</span>
      <span className={`font-mono ${positive ? 'text-success' : value < 0 ? 'text-error' : 'text-ink'}`}>
        {value > 0 && positive ? '+' : ''}{money(value)}
      </span>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, raw }: { icon: React.ElementType; label: string; value: string; raw?: boolean }) {
  return (
    <div className="bg-surface rounded-2xl p-4">
      <div className="flex items-center gap-1.5 text-[11px] text-muted mb-2">
        <Icon size={11} /> {label}
      </div>
      <div className="font-mono text-base font-semibold">
        {value}{!raw && <span className="text-[10px] font-normal text-muted ml-1">TND</span>}
      </div>
    </div>
  );
}

function ClosedSummary({ counted, expected, variance, closedAt, note }: {
  counted: number; expected: number; variance: number; closedAt?: string; note?: string;
}) {
  const ok = Math.abs(variance) < 0.001;
  return (
    <div className={`rounded-2xl p-5 border ${ok ? 'bg-success/5 border-success/30' : 'bg-error/5 border-error/30'}`}>
      <div className="flex items-center gap-2 mb-4">
        {ok ? <CheckCircle2 size={15} className="text-success" /> : <AlertTriangle size={15} className="text-error" />}
        <span className="text-sm font-semibold">{ok ? 'Caisse juste' : 'Écart de caisse'}</span>
      </div>
      <div className="space-y-2">
        <Line label="Théorique à la clôture" value={expected} />
        <Line label="Compté" value={counted} />
        <div className="flex justify-between text-sm font-semibold pt-2 border-t border-line">
          <span>Écart</span>
          <span className={`font-mono ${ok ? 'text-success' : 'text-error'}`}>
            {variance > 0 ? '+' : ''}{money(variance)}
          </span>
        </div>
      </div>
      {note && <p className="text-[11px] text-ink/80 mt-3 leading-relaxed">« {note} »</p>}
      {closedAt && (
        <p className="text-[11px] text-muted mt-2">Clôturée à {formatSalonTime(new Date(closedAt))}</p>
      )}
    </div>
  );
}

function JournalPanel({ entries, loading, onInvestigate }: {
  entries: CaisseEntry[]; loading: boolean; onInvestigate: (appointmentId: string) => void;
}) {
  if (loading) {
    return (
      <div className="p-6 space-y-2">
        {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-14 bg-surface rounded-xl animate-pulse" />)}
      </div>
    );
  }
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-muted">
        <Wallet size={26} strokeWidth={1.5} />
        <span className="text-xs">Aucun mouvement enregistré aujourd'hui.</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-4">
        Journal — {entries.length} ligne{entries.length > 1 ? 's' : ''}
      </h2>
      <div className="space-y-1.5">
        {entries.map((e) => {
          const Icon = e.kind === 'movement' && e.amount > 0 ? ArrowDownLeft : KIND_ICON[e.kind];
          const isCard = e.method === 'card';
          // LC-9 (Prompt 7) : investigable UNIQUEMENT si adossée à un Payment lié à un RDV —
          // une Sale orpheline (retail sans RDV) ou un mouvement de caisse n'ont rien à montrer.
          const investigable = e.entryType === 'payment' && !!e.appointmentId;
          return (
            <div
              key={e.id}
              onClick={investigable ? () => onInvestigate(e.appointmentId!) : undefined}
              className={[
                'flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors',
                e.affectsDrawer ? 'bg-surface border-line' : 'bg-surface/40 border-transparent',
                investigable ? 'cursor-pointer hover:border-accent/40' : '',
              ].join(' ')}
            >
              <span className="font-mono text-[11px] text-muted w-11 shrink-0 tabular-nums">
                {formatSalonTime(new Date(e.at))}
              </span>
              <span className={[
                'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
                e.amount < 0 ? 'bg-error/10 text-error' : 'bg-accent/10 text-accent',
              ].join(' ')}>
                <Icon size={13} />
              </span>

              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">{e.label}</div>
                <div className="text-[11px] text-muted truncate">
                  {e.staffName}{e.note ? ` · ${e.note}` : ''}
                </div>
              </div>

              {isCard && (
                <span className="text-[10px] font-medium text-muted border border-line rounded-full px-2 py-0.5 shrink-0">
                  carte
                </span>
              )}
              <span className={[
                'font-mono text-xs font-semibold w-28 text-right shrink-0',
                !e.affectsDrawer ? 'text-muted' : e.amount < 0 ? 'text-error' : 'text-success',
              ].join(' ')}>
                {e.amount > 0 && e.kind !== 'closing' ? '+' : ''}{money(e.amount)}
              </span>
              {investigable && <ChevronRight size={13} className="text-muted shrink-0" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HistoryPanel({ history }: { history: CashSession[] }) {
  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-muted px-8 text-center">
        <History size={26} strokeWidth={1.5} />
        <span className="text-xs">
          Aucune journée clôturée — ou session sans droit manager.
        </span>
      </div>
    );
  }
  return (
    <div className="p-6">
      <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-4">Journées de caisse</h2>
      <div className="space-y-1.5">
        {history.map((s) => {
          const variance = s.variance ?? 0;
          const ok = Math.abs(variance) < 0.001;
          return (
            <div key={s._id} className="flex items-center gap-4 px-4 py-3 rounded-xl bg-surface border border-line">
              <span className="text-xs font-medium w-32 shrink-0">{formatSalonDayLabel(s.day)}</span>
              <span className={[
                'text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0',
                s.status === 'open' ? 'text-success border-success/30' : 'text-muted border-line',
              ].join(' ')}>
                {s.status === 'open' ? 'ouverte' : 'clôturée'}
              </span>
              <div className="flex-1 flex justify-end gap-6 font-mono text-xs">
                <span className="text-muted">théorique {money(s.expectedTotal ?? 0)}</span>
                <span className="text-muted">compté {money(s.countedTotal ?? 0)}</span>
                <span className={`w-24 text-right font-semibold ${s.status === 'open' ? 'text-muted' : ok ? 'text-success' : 'text-error'}`}>
                  {s.status === 'open' ? '—' : `${variance > 0 ? '+' : ''}${money(variance)}`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Modales ────────────────────────────────────────────────────────────────

// LC-9 (SKILL_loss_control_doses.md, Prompt 7) — forme de
// GET /loss-control/appointments/:id/investigation.
interface InvestigationData {
  appointment: {
    id: string;
    status: string;
    source: string;
    start: string;
    client: { name: string; phone: string };
    stylist: { id: string; name: string };
    services: { id: string; name: string; price: number; durationMin: number }[];
  };
  doses: {
    productId: string;
    productName: string;
    /** `null` = attendu (théorique non nul) mais jamais déclaré — pas un 0 déclaré. */
    dosesDeclared: number | null;
    dosesExpected: number;
    variancePct: number | null;
    lockedAt: string | null;
    correctedBy?: string;
    correctionNote?: string;
  }[];
  payment: { id: string; amount: number; method: string; commission: number; productCommission: number } | null;
}

const INVESTIGATION_STATUS_LABEL: Record<string, string> = {
  booked: 'Booked', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled', noshow: 'No-show',
};
const INVESTIGATION_SOURCE_LABEL: Record<string, string> = {
  online: 'Online booking', walkin: 'Walk-in', phone: 'Phone booking',
};

function fmtInvestigationTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-TN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

/**
 * LC-9 — modal d'investigation RDV + doses. Réutilise le pattern d'`AppointmentDetailModal`
 * (TodayBoardView.tsx) : fetch-on-open par id, états loading/error, w-[420px], bg-surface-2/
 * border-line/rounded-2xl — le POS n'a pas de composant modal partagé, donc pattern suivi,
 * pas importé. Ouvert depuis une ligne de Caisse (`entryType:'payment'` + `appointmentId`) ;
 * prêt à être ouvert aussi depuis une alerte `extreme_usage` (même `appointmentId`) le jour où
 * une surface alertes existe côté desktop — pas construite ici, hors périmètre de ce prompt.
 */
function InvestigationModal({ appointmentId, onClose }: { appointmentId: string; onClose: () => void }) {
  const [detail, setDetail] = useState<InvestigationData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setDetail(null);
    setError('');
    api.get<InvestigationData>(`/loss-control/appointments/${appointmentId}/investigation`)
      .then(setDetail)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load this appointment.'));
  }, [appointmentId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/70">
      <div className="w-[420px] max-h-[85vh] overflow-y-auto bg-surface-2 rounded-2xl border border-line p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold flex items-center gap-1.5">
            <Droplet size={14} className="text-accent" /> Investigation RDV
          </h2>
          <button onClick={onClose} className="text-muted hover:text-ink">
            <X size={16} />
          </button>
        </div>

        {error && <p className="text-xs text-error">{error}</p>}

        {!detail && !error && (
          <div className="py-8 text-center text-muted text-sm">Loading…</div>
        )}

        {detail && (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-semibold flex items-center gap-1.5">
                  <User size={12} className="text-muted" /> {detail.appointment.client.name}
                </div>
                {detail.appointment.client.phone && (
                  <div className="text-xs text-muted mt-0.5">{detail.appointment.client.phone}</div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border border-line text-muted">
                {INVESTIGATION_STATUS_LABEL[detail.appointment.status] ?? detail.appointment.status}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border border-line text-muted">
                {INVESTIGATION_SOURCE_LABEL[detail.appointment.source] ?? detail.appointment.source}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border border-line text-muted">
                <Clock size={9} /> {fmtInvestigationTime(detail.appointment.start)}
              </span>
            </div>

            <div>
              <div className="text-[11px] font-medium text-muted mb-1.5">Stylist</div>
              <div className="text-sm">{detail.appointment.stylist.name}</div>
            </div>

            <div>
              <div className="text-[11px] font-medium text-muted mb-1.5">Services</div>
              <div className="space-y-1.5">
                {detail.appointment.services.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-sm">
                    <span>{s.name} <span className="text-muted text-xs">· {s.durationMin}min</span></span>
                    <span className="font-mono text-xs">{money(s.price)} TND</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-line pt-3">
              <div className="text-[11px] font-medium text-muted mb-2 flex items-center gap-1.5">
                <Droplet size={11} /> Doses déclarées vs théorique
              </div>
              {detail.doses.length === 0 ? (
                <p className="text-xs text-muted">Aucune dose déclarée pour ce rendez-vous.</p>
              ) : (
                <div className="space-y-2">
                  {detail.doses.map((d) => {
                    // `dosesDeclared`/`variancePct` sont `null` ensemble — attendu (théorique
                    // non nul) mais jamais déclaré, pas une déclaration à 0.
                    const declared = d.dosesDeclared !== null && d.variancePct !== null;
                    const over = declared && d.variancePct! > 0;
                    const flat = declared && Math.abs(d.variancePct!) < 0.001;
                    return (
                      <div key={d.productId} className="bg-surface rounded-xl p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium">{d.productName}</span>
                          {d.lockedAt && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-muted">
                              <ShieldCheck size={10} /> verrouillé
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted">
                            {declared
                              ? `Déclaré ${d.dosesDeclared} · Théorique ${d.dosesExpected}`
                              : `Théorique ${d.dosesExpected}`}
                          </span>
                          {declared ? (
                            <span className={[
                              'font-mono font-semibold',
                              flat ? 'text-muted' : over ? 'text-error' : 'text-accent',
                            ].join(' ')}>
                              {over ? '+' : ''}{d.variancePct!.toFixed(0)}%
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
                              Non déclarée
                            </span>
                          )}
                        </div>
                        {d.correctionNote && (
                          <p className="text-[11px] text-ink/80 mt-2 leading-relaxed border-t border-line pt-2">
                            Correction owner : « {d.correctionNote} »
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {detail.payment && (
              <div className="border-t border-line pt-3 space-y-1.5">
                <div className="text-[11px] font-medium text-muted mb-1">Encaissement</div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted">Montant ({detail.payment.method === 'cash' ? 'espèces' : 'carte'})</span>
                  <span className="font-mono">{money(detail.payment.amount)} TND</span>
                </div>
                {detail.payment.commission > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted">Commission service</span>
                    <span className="font-mono">{money(detail.payment.commission)} TND</span>
                  </div>
                )}
                {detail.payment.productCommission > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted">Commission produit</span>
                    <span className="font-mono">{money(detail.payment.productCommission)} TND</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-[380px] bg-surface-2 border border-line rounded-2xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-semibold">{title}</h3>
          <button onClick={onClose} className="text-muted hover:text-ink transition-colors">
            <X size={14} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputCls =
  'w-full bg-surface border border-line rounded-xl px-3 py-2.5 text-sm text-ink placeholder:text-muted outline-none focus:border-accent/50 transition-colors';

function OpenModal({ busy, onClose }: { busy: boolean; onClose: () => void }) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const value = Number(amount);
  const valid = amount !== '' && Number.isFinite(value) && value >= 0;

  async function submit() {
    if (!valid || busy) return;
    if (await useCaisse.getState().open(value, note || undefined)) onClose();
  }

  return (
    <Modal title="Ouvrir la caisse" onClose={onClose}>
      <label className="text-[11px] font-semibold text-muted block mb-1.5">Fond de caisse (TND)</label>
      <input
        autoFocus type="number" min="0" step="0.001" value={amount}
        onChange={(e) => setAmount(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="0.000" className={`${inputCls} font-mono mb-4`}
      />
      <label className="text-[11px] font-semibold text-muted block mb-1.5">Note (optionnel)</label>
      <input
        value={note} onChange={(e) => setNote(e.target.value)}
        placeholder="Monnaie du coffre…" className={`${inputCls} mb-5`}
      />
      <SubmitButton busy={busy} disabled={!valid} onClick={submit} label="Ouvrir la caisse" />
    </Modal>
  );
}

function MovementModal({ busy, onClose }: { busy: boolean; onClose: () => void }) {
  const [type, setType] = useState<CashMovementType>('out');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState<CashMovementReason>('achat');
  const [note, setNote] = useState('');
  const value = Number(amount);
  const valid = amount !== '' && Number.isFinite(value) && value > 0;

  async function submit() {
    if (!valid || busy) return;
    if (await useCaisse.getState().addMovement(type, value, reason, note || undefined)) onClose();
  }

  return (
    <Modal title="Mouvement d'espèces" onClose={onClose}>
      <div className="flex bg-surface rounded-xl p-0.5 mb-4">
        {([['out', 'Sortie'], ['in', 'Entrée']] as const).map(([id, label]) => (
          <button
            key={id} onClick={() => setType(id)}
            className={[
              'flex-1 py-2 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5',
              type === id ? 'bg-accent text-bg' : 'text-muted hover:text-ink',
            ].join(' ')}
          >
            {id === 'out' ? <ArrowUpRight size={12} /> : <ArrowDownLeft size={12} />} {label}
          </button>
        ))}
      </div>

      <label className="text-[11px] font-semibold text-muted block mb-1.5">Montant (TND)</label>
      <input
        autoFocus type="number" min="0" step="0.001" value={amount}
        onChange={(e) => setAmount(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="0.000" className={`${inputCls} font-mono mb-4`}
      />

      <label className="text-[11px] font-semibold text-muted block mb-1.5">Motif</label>
      <select
        value={reason} onChange={(e) => setReason(e.target.value as CashMovementReason)}
        className={`${inputCls} mb-4 cursor-pointer`}
      >
        {MOVEMENT_REASONS.map((r) => (
          <option key={r} value={r}>{REASON_LABEL[r]}</option>
        ))}
      </select>

      <label className="text-[11px] font-semibold text-muted block mb-1.5">Note (optionnel)</label>
      <input
        value={note} onChange={(e) => setNote(e.target.value)}
        placeholder="Détail de la dépense…" className={`${inputCls} mb-5`}
      />

      <SubmitButton busy={busy} disabled={!valid} onClick={submit} label="Enregistrer" />
    </Modal>
  );
}

function CloseModal({ busy, expected, onClose }: { busy: boolean; expected: number; onClose: () => void }) {
  const [counted, setCounted] = useState('');
  const [note, setNote] = useState('');
  const value = Number(counted);
  const valid = counted !== '' && Number.isFinite(value) && value >= 0;
  const variance = useMemo(() => (valid ? value - expected : 0), [valid, value, expected]);
  const ok = Math.abs(variance) < 0.001;

  async function submit() {
    if (!valid || busy) return;
    if (await useCaisse.getState().close(value, note || undefined)) onClose();
  }

  return (
    <Modal title="Clôturer la journée" onClose={onClose}>
      <div className="flex justify-between text-xs mb-4 pb-4 border-b border-line">
        <span className="text-muted">Théorique en caisse</span>
        <span className="font-mono font-semibold text-accent">{money(expected)} TND</span>
      </div>

      <label className="text-[11px] font-semibold text-muted block mb-1.5">Espèces comptées (TND)</label>
      <input
        autoFocus type="number" min="0" step="0.001" value={counted}
        onChange={(e) => setCounted(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="0.000" className={`${inputCls} font-mono mb-4`}
      />

      {valid && (
        <div className={[
          'flex items-center justify-between rounded-xl px-3 py-2.5 mb-4 border text-xs',
          ok ? 'bg-success/10 border-success/30 text-success' : 'bg-error/10 border-error/30 text-error',
        ].join(' ')}>
          <span className="font-medium flex items-center gap-1.5">
            {ok ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
            {ok ? 'Caisse juste' : variance < 0 ? 'Manquant' : 'Excédent'}
          </span>
          <span className="font-mono font-semibold">{variance > 0 ? '+' : ''}{money(variance)}</span>
        </div>
      )}

      <label className="text-[11px] font-semibold text-muted block mb-1.5">Note (optionnel)</label>
      <input
        value={note} onChange={(e) => setNote(e.target.value)}
        placeholder="Explication de l'écart…" className={`${inputCls} mb-5`}
      />

      <p className="text-[11px] text-muted mb-4 leading-relaxed">
        La clôture est définitive : plus aucun mouvement ne pourra être saisi sur cette journée.
      </p>

      <SubmitButton busy={busy} disabled={!valid} onClick={submit} label="Clôturer" />
    </Modal>
  );
}

function SubmitButton({ busy, disabled, onClick, label }: {
  busy: boolean; disabled: boolean; onClick: () => void; label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || busy}
      className={[
        'w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all',
        !disabled && !busy
          ? 'bg-accent text-bg hover:bg-amber-400 active:scale-[0.98]'
          : 'bg-surface text-muted cursor-not-allowed',
      ].join(' ')}
    >
      {busy && <Loader2 size={14} className="animate-spin" />}
      {busy ? 'Enregistrement…' : label}
    </button>
  );
}
