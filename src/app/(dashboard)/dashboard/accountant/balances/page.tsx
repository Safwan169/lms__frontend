"use client"

import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeftRight, Banknote, Coins, Loader2, RefreshCcw, SlidersHorizontal } from "lucide-react"
import toast from "react-hot-toast"

import accountingApi from "@/features/accounting/api"
import { asList, formatDate, formatMoney } from "@/features/accounting/helpers"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table-primitive"
import { Textarea } from "@/components/ui/textarea"

type BalanceAccount = {
  id: string
  account_type?: "CASH" | "BANK"
  account_name?: string
  account_number?: string | null
  bank_name?: string | null
  current_balance?: string | number
  as_of?: string
}

type HistoryRow = {
  id: string
  account_name?: string | null
  account_type?: string | null
  entry_type?: string
  amount?: string | number
  previous_balance?: string | number
  new_balance?: string | number
  note?: string | null
  created_at?: string
}

type AdjustForm = {
  balance_id: string
  amount: string
  adjustment_type: "CREDIT" | "DEBIT"
  note: string
}

type TransferForm = {
  from_balance_id: string
  to_balance_id: string
  amount: string
  note: string
}

const EMPTY_ADJUST: AdjustForm = { balance_id: "", amount: "", adjustment_type: "CREDIT", note: "" }
const EMPTY_TRANSFER: TransferForm = { from_balance_id: "", to_balance_id: "", amount: "", note: "" }

export default function AccountantBalancesPage() {
  const queryClient = useQueryClient()
  const [adjustOpen, setAdjustOpen] = useState<"CASH" | "BANK" | null>(null)
  const [adjustForm, setAdjustForm] = useState<AdjustForm>(EMPTY_ADJUST)
  const [transferOpen, setTransferOpen] = useState(false)
  const [transferForm, setTransferForm] = useState<TransferForm>(EMPTY_TRANSFER)
  const [historyFilter, setHistoryFilter] = useState({ entry_type: "all", account_type: "all" })
  const [historyPage, setHistoryPage] = useState(1)

  const balancesQuery = useQuery({
    queryKey: ["accounting", "balances"],
    queryFn: () => accountingApi.getBalances(),
  })

  const historyQuery = useQuery({
    queryKey: ["accounting", "balance-history", historyFilter, historyPage],
    queryFn: () =>
      accountingApi.getBalanceHistory({
        page: historyPage,
        limit: 20,
        entry_type: historyFilter.entry_type === "all" ? undefined : historyFilter.entry_type,
        account_type: historyFilter.account_type === "all" ? undefined : historyFilter.account_type,
      }),
  })

  const accounts: BalanceAccount[] = useMemo(() => {
    const data = balancesQuery.data as any
    return asList<BalanceAccount>(data?.accounts ?? data)
  }, [balancesQuery.data])

  const summary = (balancesQuery.data as any)?.summary ?? {}
  const cashAccounts = accounts.filter((a) => a.account_type === "CASH")
  const bankAccounts = accounts.filter((a) => a.account_type === "BANK")

  const historyItems = useMemo(() => asList<HistoryRow>(historyQuery.data as any), [historyQuery.data])
  const historyPagination = (historyQuery.data as any)?.pagination ?? {}

  const adjustMutation = useMutation({
    mutationFn: () => {
      const amount = Number(adjustForm.amount)
      if (!adjustForm.balance_id) throw new Error("Pick an account")
      if (!Number.isFinite(amount) || amount <= 0) throw new Error("Enter a valid amount")
      const payload = {
        balance_id: adjustForm.balance_id,
        amount,
        adjustment_type: adjustForm.adjustment_type,
        note: adjustForm.note || undefined,
      }
      return adjustOpen === "BANK"
        ? accountingApi.adjustBankBalance(payload)
        : accountingApi.adjustCashBalance(payload)
    },
    onSuccess: () => {
      toast.success(`${adjustOpen} balance adjusted`)
      setAdjustOpen(null)
      setAdjustForm(EMPTY_ADJUST)
      queryClient.invalidateQueries({ queryKey: ["accounting"] })
    },
    onError: (error: any) => toast.error(error?.message || "Adjustment failed"),
  })

  const transferMutation = useMutation({
    mutationFn: () => {
      const amount = Number(transferForm.amount)
      if (!transferForm.from_balance_id || !transferForm.to_balance_id) throw new Error("Pick both accounts")
      if (transferForm.from_balance_id === transferForm.to_balance_id) throw new Error("Source and destination must differ")
      if (!Number.isFinite(amount) || amount <= 0) throw new Error("Enter a valid amount")
      return accountingApi.transferBalance({
        from_balance_id: transferForm.from_balance_id,
        to_balance_id: transferForm.to_balance_id,
        amount,
        note: transferForm.note || undefined,
      })
    },
    onSuccess: () => {
      toast.success("Transfer completed")
      setTransferOpen(false)
      setTransferForm(EMPTY_TRANSFER)
      queryClient.invalidateQueries({ queryKey: ["accounting"] })
    },
    onError: (error: any) => toast.error(error?.message || "Transfer failed"),
  })

  function openAdjust(type: "CASH" | "BANK", account?: BalanceAccount) {
    setAdjustForm({ ...EMPTY_ADJUST, balance_id: account?.id ?? "" })
    setAdjustOpen(type)
  }

  return (
    <div className="space-y-6 p-1 md:p-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Balances</h1>
          <p className="text-sm text-muted-foreground">Cash & bank accounts — adjust, transfer between accounts, and review history.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setTransferOpen(true)}><ArrowLeftRight className="mr-2 size-4" /> Transfer</Button>
          <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["accounting"] })}>
            <RefreshCcw className="mr-2 size-4" /> Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Cash Total</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">BDT {formatMoney(summary.cash_total)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Bank Total</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">BDT {formatMoney(summary.bank_total)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Overall Total</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold text-emerald-700">BDT {formatMoney(summary.overall_total)}</p></CardContent>
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <AccountSection
          title="Cash Accounts"
          icon={<Coins className="size-4" />}
          accounts={cashAccounts}
          onAdjust={(account) => openAdjust("CASH", account)}
        />
        <AccountSection
          title="Bank Accounts"
          icon={<Banknote className="size-4" />}
          accounts={bankAccounts}
          onAdjust={(account) => openAdjust("BANK", account)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Balance History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Account type</p>
              <Select value={historyFilter.account_type} onValueChange={(v) => { setHistoryPage(1); setHistoryFilter((f) => ({ ...f, account_type: v })) }}>
                <option value="all">All</option>
                <option value="CASH">CASH</option>
                <option value="BANK">BANK</option>
              </Select>
            </div>
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Entry type</p>
              <Select value={historyFilter.entry_type} onValueChange={(v) => { setHistoryPage(1); setHistoryFilter((f) => ({ ...f, entry_type: v })) }}>
                <option value="all">All</option>
                <option value="ADJUSTMENT">ADJUSTMENT</option>
                <option value="CREDIT">CREDIT</option>
                <option value="DEBIT">DEBIT</option>
                <option value="TRANSFER_IN">TRANSFER_IN</option>
                <option value="TRANSFER_OUT">TRANSFER_OUT</option>
                <option value="REVERSAL">REVERSAL</option>
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Entry</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Prev → New</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyQuery.isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground">Loading…</TableCell></TableRow>
                ) : historyItems.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground">No history.</TableCell></TableRow>
                ) : (
                  historyItems.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{formatDate(row.created_at)}</TableCell>
                      <TableCell>
                        <p className="text-sm">{row.account_name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{row.account_type ?? "—"}</p>
                      </TableCell>
                      <TableCell><Badge variant="muted">{row.entry_type ?? "—"}</Badge></TableCell>
                      <TableCell className="font-medium">BDT {formatMoney(row.amount)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatMoney(row.previous_balance)} → {formatMoney(row.new_balance)}
                      </TableCell>
                      <TableCell className="max-w-72 truncate text-muted-foreground">{row.note ?? "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {historyPagination.pages && historyPagination.pages > 1 ? (
            <div className="flex items-center justify-between text-sm">
              <p className="text-muted-foreground">
                Page {historyPagination.page ?? historyPage} of {historyPagination.pages} · {historyPagination.total ?? historyItems.length} entries
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={historyPage <= 1} onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}>Prev</Button>
                <Button variant="outline" size="sm" disabled={historyPage >= (historyPagination.pages ?? 1)} onClick={() => setHistoryPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* ── Adjust Dialog ────────────────────────────────────────────────── */}
      <Dialog open={Boolean(adjustOpen)} onOpenChange={(open) => !open && setAdjustOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adjust {adjustOpen} Balance</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <p className="mb-1 text-xs font-medium">Account *</p>
              <Select value={adjustForm.balance_id} onValueChange={(v) => setAdjustForm((f) => ({ ...f, balance_id: v }))}>
                <option value="">— Select —</option>
                {(adjustOpen === "BANK" ? bankAccounts : cashAccounts).map((a) => (
                  <option key={a.id} value={a.id}>{a.account_name} (BDT {formatMoney(a.current_balance)})</option>
                ))}
              </Select>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-medium">Amount *</p>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={adjustForm.amount}
                  onChange={(e) => setAdjustForm((f) => ({ ...f, amount: e.target.value }))}
                />
              </div>
              <div>
                <p className="mb-1 text-xs font-medium">Type *</p>
                <Select value={adjustForm.adjustment_type} onValueChange={(v) => setAdjustForm((f) => ({ ...f, adjustment_type: v as any }))}>
                  <option value="CREDIT">CREDIT (increase)</option>
                  <option value="DEBIT">DEBIT (decrease)</option>
                </Select>
              </div>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium">Note</p>
              <Textarea rows={2} value={adjustForm.note} onChange={(e) => setAdjustForm((f) => ({ ...f, note: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustOpen(null)}>Cancel</Button>
            <Button disabled={adjustMutation.isPending} onClick={() => adjustMutation.mutate()}>
              {adjustMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <SlidersHorizontal className="mr-2 size-4" />}
              Adjust
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Transfer Dialog ──────────────────────────────────────────────── */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Transfer Between Accounts</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <p className="mb-1 text-xs font-medium">From *</p>
              <Select value={transferForm.from_balance_id} onValueChange={(v) => setTransferForm((f) => ({ ...f, from_balance_id: v }))}>
                <option value="">— Select source —</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>[{a.account_type}] {a.account_name} (BDT {formatMoney(a.current_balance)})</option>
                ))}
              </Select>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium">To *</p>
              <Select value={transferForm.to_balance_id} onValueChange={(v) => setTransferForm((f) => ({ ...f, to_balance_id: v }))}>
                <option value="">— Select destination —</option>
                {accounts.filter((a) => a.id !== transferForm.from_balance_id).map((a) => (
                  <option key={a.id} value={a.id}>[{a.account_type}] {a.account_name} (BDT {formatMoney(a.current_balance)})</option>
                ))}
              </Select>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium">Amount *</p>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={transferForm.amount}
                onChange={(e) => setTransferForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </div>
            <div>
              <p className="mb-1 text-xs font-medium">Note</p>
              <Textarea rows={2} value={transferForm.note} onChange={(e) => setTransferForm((f) => ({ ...f, note: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferOpen(false)}>Cancel</Button>
            <Button disabled={transferMutation.isPending} onClick={() => transferMutation.mutate()}>
              {transferMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <ArrowLeftRight className="mr-2 size-4" />}
              Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AccountSection({
  title,
  icon,
  accounts,
  onAdjust,
}: {
  title: string
  icon: React.ReactNode
  accounts: BalanceAccount[]
  onAdjust: (account: BalanceAccount) => void
}) {
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2">{icon} {title}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No accounts found.</p>
        ) : (
          accounts.map((account) => (
            <div key={account.id} className="flex items-center justify-between rounded-md border p-2">
              <div>
                <p className="text-sm font-medium">{account.account_name ?? "—"}</p>
                <p className="text-xs text-muted-foreground">
                  {account.bank_name ? `${account.bank_name} · ` : ""}
                  {account.account_number ?? ""}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">BDT {formatMoney(account.current_balance)}</p>
                <Button size="sm" variant="outline" className="mt-1" onClick={() => onAdjust(account)}>Adjust</Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
