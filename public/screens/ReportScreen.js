import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, Image, ActivityIndicator, StyleSheet, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { BarChart, PieChart } from 'react-native-chart-kit';
import { database, ref, get } from '../firebase/firebaseConfig';

// Theme colors (consistent tone)
const THEME = {
  primary: '#229954',
  primaryDark: '#1f8f47',
  surface: '#ffffff',
  background: '#f4f6f6',
  muted: '#6b6b6b',
  accent: '#4e79a7'
};

function aggregateBy(items, fieldCandidates = []) {
  const counts = {};
  items.forEach((it) => {
    let key = null;
    for (let f of fieldCandidates) {
      if (it && Object.prototype.hasOwnProperty.call(it, f) && it[f] != null) {
        key = String(it[f]);
        break;
      }
    }
    if (!key) {
      // fallback: try first string/number property
      for (let k in it) {
        if (it[k] != null && (typeof it[k] === 'string' || typeof it[k] === 'number')) {
          key = String(it[k]);
          break;
        }
      }
    }
    if (!key) key = 'Unknown';
    counts[key] = (counts[key] || 0) + 1;
  });
  return counts;
}

function buildQuickChartUrl(config) {
  const encoded = encodeURIComponent(JSON.stringify(config));
  return `https://quickchart.io/chart?c=${encoded}&width=700&height=350&format=png`;
}

function formatDate(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch (e) {
    return iso;
  }
}

class ChartErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    console.warn('Chart render error', error, info);
  }
  render() {
    if (this.state.hasError) {
      const fallback = this.props.fallbackUri;
      return <Image source={{ uri: fallback }} style={styles.chartImage} />;
    }
    return this.props.children;
  }
}

// Web-only dynamic loader for react-chartjs-2 + chart.js
function WebChartRenderer({ type, barDataJs, pieDataJs, options, fallbackUri }) {
  const [components, setComponents] = useState(null);
  useEffect(() => {
    let mounted = true;
    if (Platform.OS !== 'web') return;
    (async () => {
      try {
        await import('chart.js/auto');
        const rc2 = await import('react-chartjs-2');
        if (mounted) setComponents({ Bar: rc2.Bar, Pie: rc2.Pie });
      } catch (e) {
        console.error('Failed to load web chart libs', e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (Platform.OS !== 'web') return null;
  if (!components) return <Image source={{ uri: fallbackUri }} style={styles.chartImage} />;

  const Comp = type === 'bar' ? components.Bar : components.Pie;
  const data = type === 'bar' ? barDataJs : pieDataJs;
  return (
    <View style={{ width: '100%', height: 260, alignItems: 'center', justifyContent: 'center', paddingVertical: 6 }}>
      <View style={{ width: '92%', height: '100%', alignSelf: 'center' }}>
        <Comp data={data} options={options} />
      </View>
    </View>
  );
}

export default function ReportScreen({ navigation }) {
  function handleBack() {
    try {
      if (navigation && typeof navigation.goBack === 'function') return navigation.goBack();
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.history && window.history.length) return window.history.back();
    } catch (e) {
      console.warn('Back navigation failed', e);
    }
  }
  const [reportc, setReportc] = useState([]);
  const [authen, setAuthen] = useState([]);
  const [authUserCount, setAuthUserCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [debug, setDebug] = useState(null);
  const [chartType, setChartType] = useState('bar'); // 'bar' or 'pie'
  const [updatedAt, setUpdatedAt] = useState(null);
  // Use a ref to prevent state updates after unmount and allow manual refresh
  const isMountedRef = useRef(true);

  useEffect(() => {
    const isMounted = isMountedRef;
    async function load() {
      try {
        const rcSnap = await get(ref(database, 'reports'));
        const rcVal = rcSnap.exists() ? rcSnap.val() : null;
        const rc = rcVal ? Object.entries(rcVal).map(([id, v]) => ({ id, ...v })) : [];

        const aSnap = await get(ref(database, 'authen'));
        const aVal = aSnap.exists() ? aSnap.val() : null;
        const au = aVal ? Object.entries(aVal).map(([id, v]) => ({ id, ...v })) : [];

        if (!isMounted.current) return;
        setReportc(rc);
        setAuthen(au);
        setDebug({ reportcRaw: rcVal, authenRaw: aVal });

        try {
          const base = '';
          const resp = await fetch(base + '/users');
          if (resp && resp.ok) {
            const j = await resp.json();
            if (j && Array.isArray(j.users)) setAuthUserCount(j.users.length);
            else if (j && j.users && typeof j.users === 'object') setAuthUserCount(Object.keys(j.users).length);
            else setAuthUserCount(null);
          } else {
            setAuthUserCount(null);
          }
        } catch (e) {
          setAuthUserCount(null);
        }
      } catch (e) {
        console.error('Error loading reports/authen:', e);
      } finally {
        if (isMounted.current) setLoading(false);
        if (isMounted.current) setUpdatedAt(new Date().toISOString());
      }
    }
    load();
    return () => { isMounted.current = false; };
  }, []);

  async function refresh() {
    setLoading(true);
    isMountedRef.current = true;
    try {
      const rcSnap = await get(ref(database, 'reports'));
      const rcVal = rcSnap.exists() ? rcSnap.val() : null;
      const rc = rcVal ? Object.entries(rcVal).map(([id, v]) => ({ id, ...v })) : [];
      const aSnap = await get(ref(database, 'authen'));
      const aVal = aSnap.exists() ? aSnap.val() : null;
      const au = aVal ? Object.entries(aVal).map(([id, v]) => ({ id, ...v })) : [];
      if (!isMountedRef.current) return;
      setReportc(rc);
      setAuthen(au);
      setDebug({ reportcRaw: rcVal, authenRaw: aVal });
    } catch (e) {
      console.error('Error refreshing:', e);
    } finally {
      if (isMountedRef.current) setLoading(false);
      if (isMountedRef.current) setUpdatedAt(new Date().toISOString());
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Loading reports...</Text>
      </View>
    );
  }

  // Aggregate reportc by `type` (show report types on the chart)
  const reportCounts = aggregateBy(reportc, ['type', 'category', 'reason']);
  const reportLabels = Object.keys(reportCounts);
  const reportValues = reportLabels.map((l) => reportCounts[l]);

  // Aggregate authen by role/status/provider if available
  const authCounts = aggregateBy(authen, ['role', 'status', 'provider', 'type']);
  const authLabels = Object.keys(authCounts);
  const authValues = authLabels.map((l) => authCounts[l]);

  // Color palettes
  const colors = ['#4e79a7','#f28e2b','#e15759','#76b7b2','#59a14f','#edc949','#af7aa1','#ff9da7','#9c755f','#bab0ac'];

  // compute a sensible max for the Y axis so bars don't always fill the chart when values are small
  const maxVal = reportValues.length ? Math.max(...reportValues) : 0;
  const suggestedMax = Math.max(5, maxVal + 1);

  const barConfig = {
    type: 'bar',
    data: {
      labels: reportLabels,
      datasets: [{ label: 'ประเภท', data: reportValues, backgroundColor: colors.slice(0, reportLabels.length) }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 8, bottom: 8, left: 8, right: 8 } },
      plugins: {
        legend: { display: false },
        title: { display: true, text: 'สรุปตามประเภทของรายงาน', padding: { top: 6, bottom: 6 }, align: 'center' }
      },
      elements: { bar: { borderRadius: 6 } },
      // enforce a hard cap of 50 on the Y axis as requested
      scales: { y: { beginAtZero: true, max: 50, ticks: { stepSize: 10 }, grid: { color: '#eee' } }, x: { grid: { display: false } } }
    }
  };

  const reportPieConfig = {
    type: 'pie',
    data: {
      labels: reportLabels,
      datasets: [{ data: reportValues, backgroundColor: colors.slice(0, reportLabels.length) }]
    },
    options: { plugins: { legend: { position: 'right' }, title: { display: true, text: 'สัดส่วนตามประเภท' } } }
  };

  const pieConfig = {
    type: 'pie',
    data: {
      labels: authLabels,
      datasets: [{ data: authValues, backgroundColor: colors.slice(0, authLabels.length) }]
    },
    options: { plugins: { legend: { position: 'right' } } }
  };

  const reportChartUrl = chartType === 'bar' ? buildQuickChartUrl(barConfig) : buildQuickChartUrl(reportPieConfig);
  const pieUrl = buildQuickChartUrl(pieConfig);

  const screenWidth = Dimensions.get('window').width - 32;

  const barData = {
    labels: reportLabels.map(l => (typeof l === 'string' && l.length > 12 ? l.slice(0, 11) + '…' : l)),
    datasets: [{
      data: reportValues,
      // provide per-bar colors as functions (react-native-chart-kit supports function colors)
      colors: reportLabels.map((_, i) => (opacity = 1) => colors[i % colors.length])
    }]
  };

  // Chart.js (web) data shapes
  const barDataJs = {
    labels: reportLabels,
    datasets: [{ label: 'ประเภท', data: reportValues, backgroundColor: colors.slice(0, reportLabels.length), barThickness: 36, borderRadius: 6 }]
  };

  const pieDataJs = {
    labels: authLabels,
    datasets: [{ data: authValues, backgroundColor: colors.slice(0, authLabels.length) }]
  };

  const authPieData = authLabels.map((label, i) => ({
    name: label,
    population: authValues[i] || 0,
    color: colors[i % colors.length],
    legendFontColor: '#444',
    legendFontSize: 12
  }));

  function isValidPieData(d) {
    if (!d || !Array.isArray(d) || d.length === 0) return false;
    return d.every(item => item && (item.color || item.fill) && (typeof item.population === 'number'));
  }

  const totalReports = reportc.length;
  const totalUsers = authUserCount != null ? authUserCount : authen.length;
  const formattedUpdatedAt = formatDate(updatedAt);

  const renderTop = () => (
    <View>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Text style={styles.backText}>กลับ</Text>
        </TouchableOpacity>
        <Text style={styles.title}>รายงานข้อมูล</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={refresh}>
          <Text style={styles.refreshText}>รีเฟรช</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>รวมรายงาน</Text>
          <Text style={styles.statValue}>{totalReports}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>ผู้ใช้งาน</Text>
          <Text style={styles.statValue}>{totalUsers}</Text>
        </View>
      </View>
    </View>
  );

  const renderContent = () => (
    <View>
      <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>สรุปรายการรายงาน</Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity onPress={() => setChartType('bar')} style={[styles.toggleBtn, chartType === 'bar' && styles.toggleActive]}>
                <Text style={[styles.toggleText, chartType === 'bar' && styles.toggleTextActive]}>แท่ง</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setChartType('pie')} style={[styles.toggleBtn, chartType === 'pie' && styles.toggleActive]}>
                <Text style={[styles.toggleText, chartType === 'pie' && styles.toggleTextActive]}>วงกลม</Text>
              </TouchableOpacity>
            </View>
          </View>

          {reportLabels.length === 0 ? (
            <Text style={styles.empty}>ไม่มีข้อมูลรายงาน</Text>
          ) : (
            <>
              {Platform.OS === 'web' ? (
                <WebChartRenderer
                  type={chartType}
                  barDataJs={barDataJs}
                  pieDataJs={reportLabels.length ? { labels: reportLabels, datasets: [{ data: reportValues, backgroundColor: colors.slice(0, reportLabels.length) }] } : {}}
                  options={chartType === 'bar' ? barConfig.options : reportPieConfig.options}
                  fallbackUri={reportChartUrl}
                />
              ) : (
                chartType === 'bar' ? (
                  <ChartErrorBoundary fallbackUri={reportChartUrl}>
                      <BarChart
                        data={barData}
                        width={screenWidth}
                        // reduce native chart height so bars don't look overly tall for small counts
                        height={200}
                      fromZero={true}
                      showValuesOnTopOfBars={true}
                      withCustomBarColorFromData={true}
                      flatColor={true}
                      verticalLabelRotation={25}
                      chartConfig={{
                        backgroundGradientFrom: '#ffffff',
                        backgroundGradientTo: '#ffffff',
                        fillShadowGradient: colors[0],
                        fillShadowGradientOpacity: 1,
                        decimalPlaces: 0,
                        color: (opacity = 1) => `rgba(34,153,84, ${opacity})`,
                        labelColor: (opacity = 1) => `rgba(60,60,60, ${opacity})`,
                        propsForBackgroundLines: { stroke: '#eee', strokeDasharray: '' },
                      }}
                      style={{ borderRadius: 8 }}
                    />
                  </ChartErrorBoundary>
                ) : (
                  (() => {
                    const rp = reportLabels.map((l, i) => ({ name: l, population: reportValues[i] || 0, color: colors[i % colors.length], legendFontColor: '#444', legendFontSize: 12 }));
                    return isValidPieData(rp) ? (
                      <ChartErrorBoundary fallbackUri={reportChartUrl}>
                        <PieChart
                          data={rp}
                          width={screenWidth}
                          height={260}
                          accessor="population"
                          backgroundColor="transparent"
                          paddingLeft="15"
                          center={[0, 0]}
                          absolute={true}
                        />
                      </ChartErrorBoundary>
                    ) : (
                      <Image source={{ uri: reportChartUrl }} style={styles.chartImage} />
                    );
                  })()
                )
              )}
              <View style={styles.topRow}>
                {(Object.entries(reportCounts).sort((a,b)=>b[1]-a[1]).slice(0,5)).map(([k,v]) => (
                  <View key={k} style={styles.badge}>
                    <Text style={styles.badgeText}>{k}</Text>
                    <Text style={styles.badgeCount}>{v}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>สรุปผู้ใช้งาน</Text>
        {authLabels.length === 0 ? (
          <>
            <Text style={styles.empty}>ไม่มีข้อมูลผู้ใช้งาน</Text>
            {updatedAt ? <Text style={styles.updated}>อัพเดตล่าสุด: {formattedUpdatedAt}</Text> : null}
          </>
        ) : (
          <>
            {Platform.OS === 'web' ? (
              <WebChartRenderer type="pie" pieDataJs={pieDataJs} options={pieConfig.options} fallbackUri={pieUrl} />
            ) : isValidPieData(authPieData) ? (
              <ChartErrorBoundary fallbackUri={pieUrl}>
                <PieChart
                  data={authPieData}
                  width={screenWidth}
                  height={260}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="15"
                  center={[0, 0]}
                  absolute={true}
                />
              </ChartErrorBoundary>
            ) : (
              <Image source={{ uri: pieUrl }} style={styles.chartImage} />
            )}
            <View style={styles.legendRow}>
              {authLabels.map((label, idx) => (
                <View key={label} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors[idx % colors.length] }]} />
                  <Text style={styles.legendText}>{label} ({authValues[idx]})</Text>
                </View>
              ))}
            </View>
            {updatedAt ? <Text style={styles.updated}>อัพเดตล่าสุด: {formattedUpdatedAt}</Text> : null}
          </>
        )} 
      </View>

      <View style={styles.meta}>
        <Text>รวมรายงาน: {reportc.length}</Text>
        <Text>รวมผู้ใช้งาน: {authen.length}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {renderTop()}
      <ScrollView
        style={Platform.OS === 'web' ? { height: Dimensions.get('window').height - 220 } : { flex: 1 }}
        contentContainerStyle={{ paddingVertical: 16, paddingHorizontal: 12, flexGrow: 1 }}
      >
        {renderContent()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDEEF2', paddingVertical: 16, paddingHorizontal: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 8, color: '#111' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  refreshBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#229954', borderRadius: 8, elevation: 2 },
  refreshText: { color: '#fff', fontWeight: '700' },
  backBtn: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: THEME.surface, borderRadius: 8, borderWidth: 1, borderColor: '#eee' },
  backText: { color: '#333', fontWeight: '600' },
  card: { backgroundColor: '#fff', padding: 14, borderRadius: 12, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: '#fff', padding: 12, borderRadius: 12, marginRight: 8, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  statLabel: { color: '#666', fontSize: 12 },
  statValue: { fontSize: 20, fontWeight: '700', color: '#229954', marginTop: 6 },
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8, color: '#222' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  toggleRow: { flexDirection: 'row' },
  toggleBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#eee', marginLeft: 6, backgroundColor: '#fff' },
  toggleActive: { backgroundColor: '#229954', borderColor: '#229954' },
  toggleText: { color: '#229954', fontWeight: '600' },
  toggleTextActive: { color: '#fff' },
  topRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 },
  badge: { backgroundColor: '#f1f8f4', borderRadius: 18, paddingVertical: 6, paddingHorizontal: 10, marginRight: 8, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  badgeText: { color: '#229954', marginRight: 8, fontWeight: '600' },
  badgeCount: { backgroundColor: '#229954', color: '#fff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, overflow: 'hidden', fontSize: 12, fontWeight: '700' },
  chartImage: { width: '92%', maxWidth: 760, height: 220, alignSelf: 'center', resizeMode: 'contain', backgroundColor: '#fff', borderRadius: 8 },
  empty: { color: '#666' },
  updated: { color: '#888', fontSize: 12, marginTop: 8 },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginRight: 12, marginBottom: 8 },
  legendDot: { width: 12, height: 12, borderRadius: 6, marginRight: 6 },
  legendText: { fontSize: 12, color: '#444' },
  meta: { marginTop: 8 }
});
