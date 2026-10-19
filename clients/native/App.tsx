import React, { useEffect, useState, useRef, type ReactNode } from "react";
import { AppState, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { experienceContract, experienceDestination, feedbackCategories, type ExperienceOfferKey, type FeedbackCategory } from "./contracts";
import { addInterest, deletePlan, emptyPlan, loadPlan, savePlan, sellerSteps, sessionStore, type LocalPlan, type SecureStore } from "./localPlan";
import { R2Client, type QaBinding } from "./transport";

const tokens = { black: "#0b0b0c", panel: "#171719", gold: "#c9a96e", cream: "#f5efdf", muted: "#d9ceb8", ruby: "#ffb4b4" };
type Tab = "Home" | "Saved" | "Ask Mike" | "My Plan";
export type CandidateRuntime = { secureStore?: SecureStore; qa?: QaBinding; newRequestId?: () => string };
function Copy({ children, heading = false }: { children: ReactNode; heading?: boolean }) {
  return <Text allowFontScaling accessibilityRole={heading ? "header" : undefined} style={heading ? styles.heading : styles.copy}>{children}</Text>;
}
function Button({ title, onPress, disabled = false, selected = false }: { title: string; onPress: () => void; disabled?: boolean; selected?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled, selected }} disabled={disabled} onPress={onPress}
    style={[styles.button, selected && styles.selected, disabled && styles.disabled]}><Text allowFontScaling style={styles.buttonText}>{title}</Text></Pressable>;
}
function Field({ label, value, onChange, maxLength, multiline = false, disabled = false }: { label: string; value: string; onChange: (s: string) => void; maxLength: number; multiline?: boolean; disabled?: boolean }) {
  return <View style={styles.field}><Copy>{label}</Copy><TextInput accessibilityLabel={label} allowFontScaling style={styles.input}
    value={value} onChangeText={onChange} maxLength={maxLength} multiline={multiline} editable={!disabled} autoCorrect={false}
    autoCapitalize="sentences" textAlignVertical="top" /></View>;
}
function More({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return <View style={styles.field}><Pressable accessibilityRole="button" accessibilityState={{ expanded: open }}
    onPress={() => setOpen(value => !value)} style={styles.button}><Text allowFontScaling style={styles.buttonText}>{open ? "Hide" : "Show"} {title}</Text></Pressable>
    {open && children}</View>;
}

/** Expo entry source only. No version, identity, signing or native-build claim.
 * To change accounts, dispose/remount with a newly scoped runtime; never replace
 * a session adapter under an existing R2Client or share staff cookie storage. */
export default function App({ runtime = {} }: { runtime?: CandidateRuntime }) {
  const [services] = useState(() => {
    if (runtime.qa && !runtime.secureStore) throw Error("Connected QA requires an injected protected store.");
    const store = runtime.secureStore ?? sessionStore();
    return { store, persistent: !!runtime.secureStore, client: new R2Client(store, runtime.qa, runtime.newRequestId) };
  });
  const [tab, setTab] = useState<Tab>("Home");
  const [plan, setPlan] = useState<LocalPlan>(() => emptyPlan(Date.now()));
  const [localReady, setLocalReady] = useState(false);
  const [apiReady, setApiReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [api, setApi] = useState(services.client.snapshot());
  const [kind, setKind] = useState<"property" | "search">("search");
  const [reference, setReference] = useState("");
  const [budget, setBudget] = useState("");
  const [needs, setNeeds] = useState("");
  const [question, setQuestion] = useState("");
  const [reportCategory, setReportCategory] = useState<FeedbackCategory>("incorrect_claim");
  const scroll = useRef<ScrollView>(null);

  useEffect(() => {
    let mounted = true;
    // LOCAL reads only. No auth, API, feedback replay or permissions on mount.
    void loadPlan(services.store, Date.now()).then(value => {
      if (mounted) { setPlan(value); setNeeds(value.needs); setLocalReady(true); }
    }).catch(() => { if (mounted) setError("Local storage could not be read. Existing data was not overwritten."); });
    void services.client.restore().then(() => {
      if (mounted) { setApi(services.client.snapshot()); setApiReady(true); }
    }).catch(() => { if (mounted) setError("Receipt storage is unavailable. Local plans still work; API actions are held."); });
    const subscription = AppState.addEventListener("change", state => {
      if (state !== "active") { services.client.hideAnswer(); if (mounted) setApi(services.client.snapshot()); }
    });
    return () => { mounted = false; subscription.remove(); services.client.hideAnswer(); };
  }, [services]);

  function navigate(next: Tab) {
    if (next !== tab) { services.client.hideAnswer(); setApi(services.client.snapshot()); }
    setError(""); setNotice(""); setTab(next);
    scroll.current?.scrollTo({ y: 0, animated: false });
  }
  async function localChange(next: LocalPlan) {
    if (busy || !localReady) return false;
    setBusy(true); setError(""); setNotice("");
    try { setPlan(await savePlan(services.store, next, Date.now())); setNotice(services.persistent ? "Saved on this device only. Nothing was submitted." : "Kept for this app session only. Nothing was submitted."); return true; }
    catch { setError("Local change was not saved. Your draft is preserved; check protected storage."); return false; }
    finally { setBusy(false); }
  }
  async function apiAction(action: () => Promise<void>) {
    if (busy || !apiReady) return;
    setBusy(true); setError(""); setNotice("");
    try { await action(); }
    catch { setError(services.client.snapshot().notice); }
    finally { setApi(services.client.snapshot()); setBusy(false); }
  }
  async function openCanonical(offer: ExperienceOfferKey) {
    // OPEN ONLY: no POST, contact, answer, saved interest, auth or tracking data.
    const destination = new URL(experienceDestination(offer), experienceContract.canonicalOrigin).toString();
    try { await Linking.openURL(destination); setNotice("Form opened for your review only. Opening is not submission, a task or an appointment."); }
    catch { setError("The form could not be opened. Nothing was submitted."); }
  }
  const apiDisabled = busy || !apiReady || !services.client.connected;
  const compare = plan.compareIds;

  return <SafeAreaView style={styles.screen}>
    <View style={styles.brand}><Copy heading>ASK MAGIC MIKE</Copy><Copy>Our Town Properties · development preview</Copy></View>
    <View accessibilityRole="tablist" style={styles.tabs}>{(["Home", "Saved", "Ask Mike", "My Plan"] as Tab[]).map(name =>
      <Button key={name} title={name} selected={tab === name} onPress={() => navigate(name)} />)}</View>
    {!!notice && <Text allowFontScaling accessibilityLiveRegion="polite" style={styles.status}>{notice}</Text>}
    {!!error && <Text allowFontScaling accessibilityRole="alert" accessibilityLiveRegion="assertive" style={[styles.status, styles.error]}>{error}</Text>}
    <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      <View style={styles.card}><Copy>{services.persistent ? "Private on this device. Not synced to an account." : "Session only. Saved items disappear on app restart."}</Copy>
        <Copy>{services.client.connected ? "Synthetic QA connection · no customer messages." : "Ask Mike is not connected. Your local plan still works."}</Copy></View>

      {tab === "Home" && <View style={styles.card}>
        <Copy heading>Your next step, at your pace</Copy><Copy>Save up to eight unverified references or search preferences. Compare what you declared, then build a private buying or seller-preparation plan.</Copy>
        <Copy>Saved interests: {plan.interests.length}. Seller preparation: {plan.sellerDone.length} of {sellerSteps.length} steps checked by you.</Copy>
        <Button title="Save and compare interests" onPress={() => navigate("Saved")} /><Button title="Edit my private plan" onPress={() => navigate("My Plan")} />
        <Copy>{experienceContract.offers.buyer.claim}. {experienceContract.offers.compare.claim}.</Copy>
        <Copy>Bundled service wording ({experienceContract.version}), not current property data, a valuation or an offer.</Copy>
      </View>}

      {tab === "Saved" && <>
        <View style={styles.card}><Copy heading>Saved interests</Copy><Copy>Use plain-text references, not links or contact details. These are user-reported, unverified preferences; no lookup or enrichment happens.</Copy>
          <View style={styles.row}><Button title="Search area" selected={kind === "search"} onPress={() => setKind("search")} /><Button title="Property reference" selected={kind === "property"} onPress={() => setKind("property")} /></View>
          <Field label={kind === "search" ? "Desired area (500 characters)" : "Property reference (500 characters)"} value={reference} onChange={setReference} maxLength={500} />
          {kind === "search" && <Field label="Declared budget, optional (160 characters)" value={budget} onChange={setBudget} maxLength={160} />}
          <Button title="Save locally — sends nothing" disabled={busy || !localReady || !reference.trim() || plan.interests.length >= 8} onPress={() => {
            try {
              let index = 1; while (plan.interests.some(i => i.id === `local-${index}`)) index++;
              void localChange(addInterest(plan, kind, reference, budget, `local-${index}`)).then(saved => { if (saved) { setReference(""); setBudget(""); } });
            } catch { setError("Use a plain-text reference within the limits, without links or control characters. Keep at most eight interests."); }
          }} />
        </View>
        {plan.interests.length === 0 && <Copy>No saved interests yet. No example listings have been added.</Copy>}
        {plan.interests.map(item => <View key={item.id} style={styles.card}><Copy heading>{item.label}</Copy><Copy>User-reported · unverified · not an available listing</Copy>
          {item.declared.kind === "search" && <Copy>Declared budget: {item.declared.budget_range || "Not specified"}</Copy>}
          <View style={styles.row}><Button title={compare.includes(item.id) ? "Remove from comparison" : "Select for comparison"} selected={compare.includes(item.id)}
            disabled={busy || !localReady} onPress={() => void localChange({ ...plan, compareIds: compare.includes(item.id) ? compare.filter(id => id !== item.id) : [...compare.slice(-1), item.id] })} />
            <Button title="Remove saved interest" disabled={busy || !localReady} onPress={() => void localChange({ ...plan, interests: plan.interests.filter(i => i.id !== item.id), compareIds: compare.filter(id => id !== item.id) })} /></View>
        </View>)}
        <View style={styles.card}><Copy heading>Comparison — your declarations only</Copy><Copy>Select two interests above. No price, availability, ownership or ranking is inferred.</Copy>
          <View style={styles.row}>{plan.interests.filter(item => compare.includes(item.id)).map(item => <View key={item.id} style={styles.comparison}>
            <Copy heading>{item.label}</Copy><Copy>{item.declared.kind === "search" ? `Search area · budget ${item.declared.budget_range || "not specified"}` : "Property reference · facts not verified"}</Copy>
          </View>)}</View>
        </View>
      </>}

      {tab === "Ask Mike" && <>
        <View style={styles.card}><Copy heading>Ask Mike’s AI assistant</Copy><Copy>Source-supported guidance for Our Town Properties—not Mike personally. Ask a public process question; leave out personal details.</Copy>
          <Copy>{api.notice}</Copy><Copy>Source state: {api.validity === "valid" ? "valid at last explicit release/read; recheck before relying" : api.validity === "source_invalid" ? "source-invalid; earlier answer hidden" : "unverified; no current answer shown"}.</Copy>
          <Field label="Public process question (2,000 characters)" value={question} onChange={setQuestion} maxLength={2000} multiline disabled={busy} />
          <Button title="Ask Mike’s assistant" disabled={apiDisabled || !question.trim() || !!api.pending} onPress={() => void apiAction(() => services.client.ask(question))} />
          <Button title="Recheck saved answer + feedback" disabled={apiDisabled || !api.receipt} onPress={() => void apiAction(() => services.client.recheck())} />
          {api.receipt && <Copy>Saved answer revision {api.receipt.revision}. Only an opaque receipt is retained; answer text is not cached on device.</Copy>}
        </View>
        {api.answer && <View style={styles.card}><Copy heading>Source-supported guidance</Copy><Copy>{api.answer.message}</Copy><Copy>{api.answer.limitation}</Copy>
          <Copy>Answer revision {api.answer.revision} · source valid at last check, not continuously monitored.</Copy>
          {api.answer.citations.map(citation => <View key={citation.id} style={styles.field}><Copy>{citation.title}</Copy><Copy>As of {new Date(citation.asOf).toLocaleDateString()}</Copy>
            <Button title="Open approved public citation" onPress={() => { void Linking.openURL(citation.url).catch(() => setError("Citation could not be opened.")); }} /></View>)}
          <More title="source details">{api.answer.sourceRefs.map(ref => <Copy key={ref.versionId}>Source {ref.sourceId} · version {ref.versionId} · authorization revision {ref.revision}</Copy>)}
            {api.answer.citations.map(citation => <Copy key={citation.id}>Version {citation.version} · retrieved/as of {citation.asOf}</Copy>)}
            <Copy>No effective/publication date is supplied by this public citation contract.</Copy></More>
          <View style={styles.row}><Button title="Helpful" disabled={apiDisabled || !!api.pending || api.feedback.some(f => f.kind !== "report")} onPress={() => void apiAction(() => services.client.feedback("helpful"))} />
            <Button title="Not helpful" disabled={apiDisabled || !!api.pending || api.feedback.some(f => f.kind !== "report")} onPress={() => void apiAction(() => services.client.feedback("not_helpful"))} /></View>
          <Copy>Report a problem — choose a category</Copy><View style={styles.row}>{feedbackCategories.map(value => <Button key={value} title={value.replace(/_/g, " ")} selected={reportCategory === value} disabled={busy || !!api.pending} onPress={() => setReportCategory(value)} />)}</View>
          <Button title="Submit category report" disabled={apiDisabled || !!api.pending || api.feedback.some(f => f.kind === "report")} onPress={() => void apiAction(() => services.client.feedback("report", reportCategory))} />
          <More title="feedback privacy"><Copy>Feedback is linked to this session, not anonymous. No comment is collected here. It does not request contact or train AI. Feedback is readable until its recorded expiry (at most 30 days); stored cleanup is not automatic. Account deletion removes linked feedback; minimal staff audit may remain.</Copy></More>
        </View>}
        {api.feedback.map(item => <View key={item.id} style={styles.card}><Copy>Recorded: {item.kind.replace(/_/g, " ")} · {item.status} · review revision {item.revision}</Copy><Copy>Expires {item.expiresAt}</Copy></View>)}
        {api.pending && <View style={styles.card}><Copy>Unconfirmed feedback: {api.pending.kind.replace(/_/g, " ")}. Its exact request key and payload are locked, including across reload with the same protected store/session scope.</Copy>
          <Button title="Retry exact saved feedback request" disabled={apiDisabled} onPress={() => void apiAction(() => services.client.retryFeedback())} /></View>}
        <View style={styles.card}><Copy heading>Want human help?</Copy><Copy>Open a form, review it, then decide whether to submit. Opening sends nothing. Your local notes stay here.</Copy>
          <Button title="OPEN buying form" onPress={() => void openCanonical("buyer")} /><Button title="OPEN selling comparison form" onPress={() => void openCanonical("compare")} />
          <Button title="OPEN home-value review form" onPress={() => void openCanonical("homeValue")} /></View>
      </>}

      {tab === "My Plan" && <View style={styles.card}><Copy heading>My private plan</Copy><Copy>Declared needs only. Do not add names, contact details or secrets. This is not an inquiry, financing assessment or appointment.</Copy>
        <Field label="Buying needs (1,000 characters; one paragraph)" value={needs} onChange={value => setNeeds(value.replace(/[\r\n]/g, " "))} maxLength={1000} multiline />
        <Button title="Save my plan locally" disabled={busy || !localReady} onPress={() => void localChange({ ...plan, needs })} />
        <Copy heading>Seller preparation</Copy>{sellerSteps.map((step, index) => <Button key={step} title={`${plan.sellerDone.includes(index) ? "Done" : "To do"}: ${step}`} selected={plan.sellerDone.includes(index)} disabled={busy || !localReady}
          onPress={() => void localChange({ ...plan, sellerDone: plan.sellerDone.includes(index) ? plan.sellerDone.filter(i => i !== index) : [...plan.sellerDone, index] })} />)}
        <Copy>Local retention: up to 30 days since an edit, checked/removed on the next local load; no background purge or sync. Account access/deletion and native authentication remain held. This delete action affects only local saved interests and the plan, not server feedback.</Copy>
        <Button title="Delete local saved interests + plan" disabled={busy} onPress={() => {
          if (busy) return;
          setBusy(true); setError("");
          void deletePlan(services.store).then(() => { setPlan(emptyPlan(Date.now())); setNeeds(""); setLocalReady(true); setNotice("Local interests and plan deleted from the supplied store. Device backup deletion is not claimed."); })
            .catch(() => setError("Local deletion was not confirmed; data remains visible." )).finally(() => setBusy(false));
        }} />
      </View>}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.black },
  brand: { padding: 16, gap: 6 }, tabs: { paddingHorizontal: 12, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  content: { padding: 16, paddingBottom: 48, gap: 16 },
  card: { backgroundColor: tokens.panel, borderColor: tokens.gold, borderWidth: 1, borderRadius: 12, padding: 16, gap: 12 },
  heading: { color: tokens.cream, fontSize: 20, fontWeight: "600", flexShrink: 1 },
  copy: { color: tokens.muted, fontSize: 16, flexShrink: 1 }, error: { color: tokens.ruby, fontSize: 16 },
  status: { color: tokens.muted, fontSize: 16, paddingHorizontal: 16, paddingVertical: 8 },
  button: { minHeight: 44, minWidth: 44, borderWidth: 1, borderColor: tokens.gold, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, justifyContent: "center", flexShrink: 1 },
  buttonText: { color: tokens.cream, fontSize: 16, flexShrink: 1 }, selected: { backgroundColor: "#463921" }, disabled: { opacity: 0.5 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 12 }, field: { gap: 8 },
  input: { minHeight: 48, color: tokens.cream, fontSize: 16, borderColor: tokens.gold, borderWidth: 1, borderRadius: 8, padding: 12 },
  comparison: { flexGrow: 1, flexShrink: 1, flexBasis: 180, gap: 8 },
});
