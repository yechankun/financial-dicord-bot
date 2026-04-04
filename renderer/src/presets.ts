import type { IndicatorPreset } from './types';

export const INDICATOR_PRESETS: IndicatorPreset[] = [
    {
        id: 'finra-short-volume',
        label: 'FINRA Short Volume',
        description: 'Direct short-volume columns with a 5-bar average.',
        code: `//@version=5
indicator("FINRA Short Volume", overlay=false)
plot(close, "Short Volume", color=color.red, style=plot.style_columns)
plot(ta.sma(close, 5), "SMA 5", color=color.orange)
`,
    },
    {
        id: 'ema-cross',
        label: 'EMA Cross',
        description: 'Fast/slow moving average overlay for trend structure.',
        code: `//@version=5
indicator("EMA Cross", overlay=true)
fast = ta.ema(close, 9)
slow = ta.ema(close, 21)
plot(fast, "EMA 9", color=color.orange)
plot(slow, "EMA 21", color=color.blue)
`,
    },
    {
        id: 'bollinger-bands',
        label: 'Bollinger Bands',
        description: 'Configurable Bollinger Bands with selectable basis MA.',
        warmupBars: 40,
        code: `//@version=5
indicator(shorttitle="BB", title="Bollinger Bands", overlay=true)
length = input.int(20, "Length", minval=1)
maType = input.string("SMA", "Basis MA Type", options=["SMA", "EMA", "SMMA (RMA)", "WMA", "VWMA"])
src = input(close, "Source")
mult = input.float(2.0, "StdDev", minval=0.001, maxval=50)
offset = input.int(0, "Offset", minval=-500, maxval=500)

ma(source, length, _type) =>
    switch _type
        "SMA" => ta.sma(source, length)
        "EMA" => ta.ema(source, length)
        "SMMA (RMA)" => ta.rma(source, length)
        "WMA" => ta.wma(source, length)
        "VWMA" => ta.vwma(source, length)

basis = ma(src, length, maType)
dev = mult * ta.stdev(src, length)
upper = basis + dev
lower = basis - dev

plot(basis, "Basis", color=#2962FF, offset=offset)
p1 = plot(upper, "Upper", color=#F23645, offset=offset)
p2 = plot(lower, "Lower", color=#089981, offset=offset)
fill(p1, p2, title="Background", color=color.rgb(33, 150, 243, 95))
`,
    },
    {
        id: 'rsi',
        label: 'RSI',
        description: 'Momentum oscillator in a lower pane.',
        code: `//@version=5
indicator("RSI", overlay=false)
r = ta.rsi(close, 14)
plot(r, "RSI", color=color.aqua)
plot(70, "Overbought", color=color.red)
plot(30, "Oversold", color=color.lime)
`,
    },
    {
        id: 'macd',
        label: 'MACD',
        description: 'MACD lines and histogram.',
        code: `//@version=5
indicator("MACD", overlay=false)
[macdLine, signalLine, hist] = ta.macd(close, 12, 26, 9)
plot(hist, "Histogram", color=color.gray, style=plot.style_histogram)
plot(macdLine, "MACD", color=color.blue)
plot(signalLine, "Signal", color=color.orange)
`,
    },
    {
        id: 'supertrend',
        label: 'Supertrend',
        description: 'ATR-based trend overlay with directional line breaks.',
        warmupBars: 30,
        code: `//@version=5
indicator("Supertrend", overlay=true)
atrPeriod = input.int(10, "ATR Length", minval=1)
factor = input.float(3.0, "Factor", minval=0.01, step=0.01)

[supertrend, direction] = ta.supertrend(factor, atrPeriod)
supertrend := barstate.isfirst ? na : supertrend

upTrend = plot(direction < 0 ? supertrend : na, "Up Trend", color=color.green, style=plot.style_linebr)
downTrend = plot(direction < 0 ? na : supertrend, "Down Trend", color=color.red, style=plot.style_linebr)
bodyMiddle = plot(barstate.isfirst ? na : (open + close) / 2, "Body Middle", display=display.none)

fill(bodyMiddle, upTrend, title="Uptrend background", color=color.new(color.green, 90), fillgaps=false)
fill(bodyMiddle, downTrend, title="Downtrend background", color=color.new(color.red, 90), fillgaps=false)
`,
    },
    {
        id: 'delta-delta-turn-scanner',
        label: 'Delta Delta Turn Scanner',
        description: 'Second-derivative conviction histogram with parabolic reversal markers.',
        warmupBars: 120,
        code: `//@version=5
indicator("ΔΔ Turn Scanner", overlay=false)

baseSrc = input(close, "Price Source")
srcMode = input.string("RAW", "Source Mode", options=["RAW", "HLC3", "OHLC4", "SMA", "EMA"])
maLen = input.int(20, "MA Length", minval=1)

rocLen = input.int(12, "ROC Length", minval=1)
rocSm = input.int(5, "ROC Smooth", minval=1)
dSm = input.int(3, "Δ Smooth", minval=1)

pctLen = input.int(80, "Percentile Lookback", minval=20)
parabPct = input.float(95, "Parabolic Percentile", minval=80, maxval=99, step=1)

showBg = input.bool(true, "Background")
showDelta = input.bool(false, "Show Δ Line")

src = switch srcMode
    "RAW" => baseSrc
    "HLC3" => hlc3
    "OHLC4" => ohlc4
    "SMA" => ta.sma(baseSrc, maLen)
    "EMA" => ta.ema(baseSrc, maLen)

roc_raw = 100.0 * (src / src[rocLen] - 1.0)
roc = ta.ema(roc_raw, rocSm)
d1_raw = roc - roc[1]
d1 = ta.ema(d1_raw, dSm)
d2 = d1 - d1[1]
isBull = d2 >= 0

d2Abs = math.abs(d2)
d2AbsMax = ta.highest(d2Abs, pctLen)
strength = d2AbsMax > 0 ? d2Abs / d2AbsMax : 0.0
deltaConfirmed = (isBull and d1 > 0) or (not isBull and d1 < 0)

rocHi = ta.highest(roc, pctLen)
rocLo = ta.lowest(roc, pctLen)
rocRange = rocHi - rocLo
rocPct = rocRange > 0 ? 100.0 * (roc - rocLo) / rocRange : 50.0
isParabolicUp = rocPct >= parabPct
isParabolicDown = rocPct <= (100.0 - parabPct)
isExtreme = isParabolicUp or isParabolicDown

phase = deltaConfirmed ? 1.0 : isExtreme ? 0.8 : 0.5
bullNum = isBull ? 1.0 : -1.0
conviction = bullNum * strength * phase
absConv = math.abs(conviction)

fallSky = isParabolicUp and d2 < 0 and d2[1] >= 0 and barstate.isconfirmed
snapBack = isParabolicDown and d2 > 0 and d2[1] <= 0 and barstate.isconfirmed

hline(0, "Zero", color=color.new(color.gray, 70))

c_bull = color.from_gradient(absConv, 0.0, 0.7, color.new(#00C853, 90), color.new(#00E676, 0))
c_bear = color.from_gradient(absConv, 0.0, 0.7, color.new(#FF1744, 90), color.new(#FF1744, 0))
histCol = conviction >= 0 ? c_bull : c_bear

plot(conviction, "Conviction", style=plot.style_histogram, color=histCol, linewidth=4)
plot(showDelta ? d1 : na, "Δ", color=color.new(#FFAB40, 60), linewidth=1)

bgAlpha = absConv > 0.4 ? 91 : 96
bgCol = isBull ? color.new(#00C853, bgAlpha) : color.new(#FF1744, bgAlpha)
bgcolor(showBg ? bgCol : na)

plotshape(fallSky, "Parabolic Top", shape.labeldown, location.top, color.new(#FF1744, 0), size=size.small, text="!")
plotshape(snapBack, "Parabolic Bottom", shape.labelup, location.bottom, color.new(#00E676, 0), size=size.small, text="!")
`,
    },
    {
        id: 'short-volume-profile',
        label: 'Short Volume Profile',
        description: 'Date-range profile built from FINRA short volume or close*short volume.',
        code: `//@version=5
indicator("Short Volume Profile (Date Range)", overlay=true, max_lines_count=500)

row = input.int(70, "Row Size", minval=10, maxval=500)
show_rpoc = input.bool(false, "Show Rolling POC")
start_time = input.time(timestamp("01 Jan 2024 00:00 +0900"), "Start Time")
end_time_input = input.time(timestamp("31 Dec 2026 23:59 +0900"), "End Time")
use_now_as_end = input.bool(true, "Use Now as End")
effective_end = use_now_as_end ? time : end_time_input
max_range_scan = input.int(3000, "Max Range Scan Bars", minval=200, maxval=10000)

width = input.int(50, "Width (% of the box)", minval=1, maxval=100)
bar_width = input.int(2, "Bar Width", minval=1, maxval=10)
flip = input.bool(false, "Flip Histogram")
solid = input.color(#2157f3, "Rows Solid Color")
poc_color = input.color(#ff5d00, "POC Color")
v_option = input.string("Close * Short Volume", "Source", options=["Short Volume", "Close * Short Volume"])

short_ticker = "FINRA:" + syminfo.ticker + "_SHORT_VOLUME"
sv_tf = request.security(short_ticker, timeframe.period, close)
profile_value = v_option == "Short Volume" ? sv_tf : sv_tf * close
barDurMs = timeframe.in_seconds(timeframe.period) * 1000

var a = array.new_line()
var b = array.new_line()
if barstate.isfirst
    for i = 0 to row - 1
        array.push(a, line.new(na, na, na, na, width=bar_width))
    array.push(b, line.new(na, na, na, na, width=bar_width))

f_range_span_and_hilo(int maxBars) =>
    int scan = math.min(maxBars, 10000)
    int oldestOff = na
    int newestOff = na
    int cnt = 0
    float hi = na
    float lo = na
    for k = 0 to scan - 1
        bool inR = (time[k] <= effective_end) and (time[k] + barDurMs > start_time)
        if inR
            cnt += 1
            oldestOff := na(oldestOff) ? k : math.max(oldestOff, k)
            newestOff := na(newestOff) ? k : math.min(newestOff, k)
            hi := na(hi) ? high[k] : math.max(hi, high[k])
            lo := na(lo) ? low[k] : math.min(lo, low[k])
    [oldestOff, newestOff, cnt, hi, lo]

var levels = array.new_float()
var sumv = array.new_float()
var float Alvl = 0.0
var float Blvl = 0.0

line l = na
line poc = na

condition = show_rpoc ? true : barstate.islast
if condition
    [oldOff, newOff, cnt, hiR, loR] = f_range_span_and_hilo(max_range_scan)

    if cnt > 0 and not na(oldOff) and not na(newOff) and not na(hiR) and not na(loR) and hiR > loR
        int spanBars = oldOff - newOff + 1
        int anchorX = bar_index - newOff

        array.clear(levels)
        array.clear(sumv)

        for i = 0 to row
            array.push(levels, loR + i / row * (hiR - loR))

        for j = 0 to row - 1
            float sum = 0.0
            for k = 0 to spanBars - 1
                int off = newOff + k
                bool barInRange = (time[off] <= effective_end) and (time[off] + barDurMs > start_time)
                if barInRange and high[off] > array.get(levels, j) and low[off] < array.get(levels, j + 1)
                    sum += nz(profile_value[off])
            array.push(sumv, sum)

        float maxSum = array.max(sumv)

        for j = 0 to row - 1
            float mult = maxSum != 0.0 ? array.get(sumv, j) / maxSum : 0.0
            l := array.get(a, j)
            float get = array.get(levels, j)

            if flip
                line.set_xy1(l, anchorX, get)
                line.set_xy2(l, anchorX - math.round(spanBars * width / 100 * mult), get)
            else
                line.set_xy1(l, anchorX - spanBars + 1, get)
                line.set_xy2(l, anchorX - spanBars + 1 + math.round(spanBars * width / 100 * mult), get)

            line.set_color(l, solid)
            line.set_width(l, bar_width)

            if mult == 1
                poc := array.get(b, 0)
                float avg = math.avg(get, array.get(levels, j + 1))
                if flip
                    line.set_xy1(poc, anchorX, avg)
                    line.set_xy2(poc, anchorX - spanBars + 1, avg)
                else
                    line.set_xy1(poc, anchorX - spanBars + 1, avg)
                    line.set_xy2(poc, anchorX, avg)
                line.set_color(poc, poc_color)
                line.set_style(poc, line.style_dotted)
                line.set_width(poc, bar_width)

        if show_rpoc
            int pocIndex = array.indexof(sumv, maxSum)
            Alvl := array.get(levels, pocIndex)
            Blvl := array.get(levels, pocIndex + 1)

plot(show_rpoc ? math.avg(Alvl, Blvl) : na, "Rolling POC", color=#ff1100)
`,
    },
    {
        id: 'returns-bollinger-bands',
        label: 'Returns + Bollinger Bands',
        description: 'Multi-horizon return oscillator with optional averages and Bollinger bands.',
        warmupBars: 800,
        code: `//@version=5
indicator("수익률 + 볼린저밴드", overlay=false)

p1 = input.int(70, "수익률 기간 1 (단기)", minval=1)
p2 = input.int(140, "수익률 기간 2 (중기)", minval=1)
p3 = input.int(210, "수익률 기간 3 (장기)", minval=1)

show_avg = input.bool(false, "수익률 평균 표시")

avg_len = input.int(128, "평균 길이")
avg2_len = input.int(256, "평균 길이2")

show_p1_return = input.bool(true, "기간1(p1) 수익률 표시")
show_p2_return = input.bool(false, "기간2(p2) 수익률 표시")
show_p3_return = input.bool(false, "기간3(p3) 수익률 표시")

show_p1_bb = input.bool(true, "기간1(p1) 볼린저밴드 표시")
show_p2_bb = input.bool(false, "기간2(p2) 볼린저밴드 표시")
show_p3_bb = input.bool(false, "기간3(p3) 볼린저밴드 표시")

show_bb_1 = input.bool(true, "볼린저밴드 #1 표시")
len_bb_1 = input.int(520, "볼린저밴드 #1 기간", minval=1)
std_1 = input.float(2.0, "표준편차 #1", step=0.1)

show_bb_2 = input.bool(false, "볼린저밴드 #2 표시")
len_bb_2 = input.int(520, "볼린저밴드 #2 기간", minval=1)
std_2 = input.float(3.0, "표준편차 #2", step=0.1)

show_bb_3 = input.bool(false, "볼린저밴드 #3 표시")
len_bb_3 = input.int(520, "볼린저밴드 #3 기간", minval=1)
std_3 = input.float(3.5, "표준편차 #3", step=0.1)

blue1 = color.new(#00fff2, 0)
blue2 = color.new(color.blue, 0)
blue3 = color.new(#0000ff, 0)

inv_blue1 = color.new(#ff000d, 0)
inv_blue2 = color.new(#ffaeae, 0)
inv_blue3 = color.new(#ffcccc, 0)

avg_color1 = color.new(#fbff00, 0)
avg_color2 = color.new(#e98930, 0)
avg_color3 = color.new(#683700, 0)

avg2_color1 = color.new(#abff00, 0)
avg2_color2 = color.new(#b98930, 0)
avg2_color3 = color.new(#383700, 0)

r_s1 = (close - close[p1]) / close[p1] * 100
r_s2 = (close - close[p2]) / close[p2] * 100
r_s3 = (close - close[p3]) / close[p3] * 100

avg_s1 = ta.sma(r_s1, avg_len)
avg_s2 = ta.sma(r_s2, avg_len)
avg_s3 = ta.sma(r_s3, avg_len)

avg2_s1 = ta.sma(r_s1, avg2_len)
avg2_s2 = ta.sma(r_s2, avg2_len)
avg2_s3 = ta.sma(r_s3, avg2_len)

b_s1_1 = ta.sma(r_s1, len_bb_1)
d_s1_1 = ta.stdev(r_s1, len_bb_1)
u_s1_1 = b_s1_1 + std_1 * d_s1_1
l_s1_1 = b_s1_1 - std_1 * d_s1_1

b_s2_1 = ta.sma(r_s2, len_bb_1)
d_s2_1 = ta.stdev(r_s2, len_bb_1)
u_s2_1 = b_s2_1 + std_1 * d_s2_1
l_s2_1 = b_s2_1 - std_1 * d_s2_1

b_s3_1 = ta.sma(r_s3, len_bb_1)
d_s3_1 = ta.stdev(r_s3, len_bb_1)
u_s3_1 = b_s3_1 + std_1 * d_s3_1
l_s3_1 = b_s3_1 - std_1 * d_s3_1

b_s1_2 = ta.sma(r_s1, len_bb_2)
d_s1_2 = ta.stdev(r_s1, len_bb_2)
u_s1_2 = b_s1_2 + std_2 * d_s1_2
l_s1_2 = b_s1_2 - std_2 * d_s1_2

b_s2_2 = ta.sma(r_s2, len_bb_2)
d_s2_2 = ta.stdev(r_s2, len_bb_2)
u_s2_2 = b_s2_2 + std_2 * d_s2_2
l_s2_2 = b_s2_2 - std_2 * d_s2_2

b_s3_2 = ta.sma(r_s3, len_bb_2)
d_s3_2 = ta.stdev(r_s3, len_bb_2)
u_s3_2 = b_s3_2 + std_2 * d_s3_2
l_s3_2 = b_s3_2 - std_2 * d_s3_2

b_s1_3 = ta.sma(r_s1, len_bb_3)
d_s1_3 = ta.stdev(r_s1, len_bb_3)
u_s1_3 = b_s1_3 + std_3 * d_s1_3
l_s1_3 = b_s1_3 - std_3 * d_s1_3

b_s2_3 = ta.sma(r_s2, len_bb_3)
d_s2_3 = ta.stdev(r_s2, len_bb_3)
u_s2_3 = b_s2_3 + std_3 * d_s2_3
l_s2_3 = b_s2_3 - std_3 * d_s2_3

b_s3_3 = ta.sma(r_s3, len_bb_3)
d_s3_3 = ta.stdev(r_s3, len_bb_3)
u_s3_3 = b_s3_3 + std_3 * d_s3_3
l_s3_3 = b_s3_3 - std_3 * d_s3_3

plot(show_p1_return ? r_s1 : na, "수익률 (기간1)", color=blue1)
plot(show_p2_return ? r_s2 : na, "수익률 (기간2)", color=blue2)
plot(show_p3_return ? r_s3 : na, "수익률 (기간3)", color=blue3)

plot(show_avg and show_p1_return ? avg_s1 : na, "수익률 평균 (기간1)", color=avg_color1)
plot(show_avg and show_p2_return ? avg_s2 : na, "수익률 평균 (기간2)", color=avg_color2)
plot(show_avg and show_p3_return ? avg_s3 : na, "수익률 평균 (기간3)", color=avg_color3)

plot(show_avg and show_p1_return ? avg2_s1 : na, "수익률 평균2 (기간1)", color=avg2_color1)
plot(show_avg and show_p2_return ? avg2_s2 : na, "수익률 평균2 (기간2)", color=avg2_color2)
plot(show_avg and show_p3_return ? avg2_s3 : na, "수익률 평균2 (기간3)", color=avg2_color3)

plot(show_p1_bb and show_bb_1 ? u_s1_1 : na, "r_s1 BB#1 상단", color=inv_blue1)
plot(show_p1_bb and show_bb_1 ? math.max(l_s1_1, -100) : na, "r_s1 BB#1 하단", color=inv_blue1)
plot(show_p1_bb and show_bb_2 ? u_s1_2 : na, "r_s1 BB#2 상단", color=inv_blue1)
plot(show_p1_bb and show_bb_2 ? math.max(l_s1_2, -100) : na, "r_s1 BB#2 하단", color=inv_blue1)
plot(show_p1_bb and show_bb_3 ? u_s1_3 : na, "r_s1 BB#3 상단", color=inv_blue1)
plot(show_p1_bb and show_bb_3 ? math.max(l_s1_3, -100) : na, "r_s1 BB#3 하단", color=inv_blue1)

plot(show_p2_bb and show_bb_1 ? u_s2_1 : na, "r_s2 BB#1 상단", color=inv_blue2)
plot(show_p2_bb and show_bb_1 ? math.max(l_s2_1, -100) : na, "r_s2 BB#1 하단", color=inv_blue2)
plot(show_p2_bb and show_bb_2 ? u_s2_2 : na, "r_s2 BB#2 상단", color=inv_blue2)
plot(show_p2_bb and show_bb_2 ? math.max(l_s2_2, -100) : na, "r_s2 BB#2 하단", color=inv_blue2)
plot(show_p2_bb and show_bb_3 ? u_s2_3 : na, "r_s2 BB#3 상단", color=inv_blue2)
plot(show_p2_bb and show_bb_3 ? math.max(l_s2_3, -100) : na, "r_s2 BB#3 하단", color=inv_blue2)

plot(show_p3_bb and show_bb_1 ? u_s3_1 : na, "r_s3 BB#1 상단", color=inv_blue3)
plot(show_p3_bb and show_bb_1 ? math.max(l_s3_1, -100) : na, "r_s3 BB#1 하단", color=inv_blue3)
plot(show_p3_bb and show_bb_2 ? u_s3_2 : na, "r_s3 BB#2 상단", color=inv_blue3)
plot(show_p3_bb and show_bb_2 ? math.max(l_s3_2, -100) : na, "r_s3 BB#2 하단", color=inv_blue3)
plot(show_p3_bb and show_bb_3 ? u_s3_3 : na, "r_s3 BB#3 상단", color=inv_blue3)
plot(show_p3_bb and show_bb_3 ? math.max(l_s3_3, -100) : na, "r_s3 BB#3 하단", color=inv_blue3)

hline(0, "0라인", color.gray, hline.style_dotted)
`,
    },
    {
        id: 'sochan-band',
        label: 'Sochan Band',
        description: 'Short volume oscillator with half Bollinger bands, split adjustment, and market-cap ratio mode.',
        warmupBars: 260,
        code: `//@version=5
indicator(title="Short Volume + Half Bollinger Band(Sochan Band)", shorttitle="SochanBand", overlay=false)

enable_split_adjustment = input.bool(false, "Enable Split Adjustment", group="Split Adjustment")
manual_adjustment = input.float(1.0, "Manual Adjustment Factor", minval=0.00001, step=0.01, group="Split Adjustment")
use_manual = input.bool(false, "Use Manual Adjustment", group="Split Adjustment")

enable_bb = input.bool(true, "Enable Bollinger Band", group="BB")
length = input.int(240, minval=1, group="BB")
src_bb = input.string("Standard Deviation", "Band Source", options=["Standard Deviation", "mult"], group="BB") == "Standard Deviation"

mult1 = input.float(1.0, minval=0.001, maxval=50, title="BB#1 StdDev", group="BB")
mult2 = input.float(2.0, minval=0.001, maxval=50, title="BB#2 StdDev", group="BB")
mult3 = input.float(3.0, minval=0.001, maxval=50, title="BB#3 StdDev", group="BB")
mult4 = input.float(4.5, minval=0.001, maxval=50, title="BB#4 StdDev", group="BB")

offset = input.int(0, "Offset", minval=-500, maxval=500, group="BB")

sourceType = input.string("Short Volume*Price", "Source Type", options=["Short Volume", "Short Volume*Price", "Short Ratio", "Short Value/MarketCap"], group="Source")
priceType  = input.string("Close", "Price Source (for Value)", options=["Close", "Open", "High", "Low", "HL2", "HLC3", "OHLC4"], group="Source")
sumLength  = input.int(0, "Volume Sum Length", minval=0, maxval=500, group="Source")

isVolume      = sourceType == "Short Volume"
isVolumePrice = sourceType == "Short Volume*Price"
isRatio       = sourceType == "Short Ratio"
isMcapRatio   = sourceType == "Short Value/MarketCap"
isSum         = sumLength > 0

short_ticker = "FINRA:" + syminfo.ticker + "_SHORT_VOLUME"

f_price() =>
    switch priceType
        "Close"  => close
        "Open"   => open
        "High"   => high
        "Low"    => low
        "HL2"    => hl2
        "HLC3"   => hlc3
        "OHLC4"  => ohlc4
        => close

priceSrc = f_price()

isFund = syminfo.type == "fund"
financialId = isFund ? "AUM" : "TOTAL_SHARES_OUTSTANDING"
financialValue = request.financial(syminfo.tickerid, financialId, isFund ? "D" : "FQ")

f_get_denom(p) =>
    isFund ? financialValue : not na(financialValue) and not na(p) ? financialValue * p : na

splitNumerator = request.splits(syminfo.tickerid, splits.numerator, barmerge.gaps_on)
splitDenominator = request.splits(syminfo.tickerid, splits.denominator, barmerge.gaps_on)
splitRatio = not na(splitNumerator) and not na(splitDenominator) and splitNumerator != 0 ? splitDenominator / splitNumerator : na

var float cumulative_adjustment = 1.0
if enable_split_adjustment and not na(splitRatio)
    cumulative_adjustment := cumulative_adjustment * splitRatio

source_tf = request.security(short_ticker, timeframe.period, close, barmerge.gaps_on)
adjusted_source_tf = enable_split_adjustment ? source_tf * cumulative_adjustment / (use_manual ? manual_adjustment : 1.0) : source_tf

real_tf = isVolume      ? adjusted_source_tf :
          isVolumePrice ? adjusted_source_tf * priceSrc :
          isMcapRatio   ? adjusted_source_tf * priceSrc :
          isRatio       ? adjusted_source_tf / volume :
          na

real = isSum ? math.sum(real_tf, sumLength) / (isRatio ? sumLength : 1.0) : real_tf

if isMcapRatio
    denom = f_get_denom(priceSrc)
    real := not na(denom) and denom != 0 ? real / denom : na

basis = enable_bb ? ta.sma(real, length) : na
x = enable_bb ? (src_bb ? ta.stdev(real, length) : ta.sma(real, length)) : na

upper1 = enable_bb ? basis + mult1 * x : na
upper2 = enable_bb ? basis + mult2 * x : na
upper3 = enable_bb ? basis + mult3 * x : na
upper4 = enable_bb ? basis + mult4 * x : na

bas = plot(basis, "Basis", color=enable_bb ? #FF6D00 : na, offset=offset)
p11 = plot(upper1, "BB_Upper1", color=enable_bb ? #4caf50 : na, offset=offset)
fill(p11, bas, title="BB_Background1", color=enable_bb ? color.rgb(76, 175, 80, 100) : na)

p12 = plot(upper2, "BB_Upper2", color=enable_bb ? #ffeb3b : na, offset=offset)
fill(p12, bas, title="BB_Background2", color=enable_bb ? color.rgb(255, 235, 59, 100) : na)

p13 = plot(upper3, "BB_Upper3", color=enable_bb ? #f44336 : na, offset=offset)
fill(p13, bas, title="BB_Background3", color=enable_bb ? color.rgb(244, 67, 54, 100) : na)

p14 = plot(upper4, "BB_Upper4", color=enable_bb ? #ff9800 : na, offset=offset)
fill(p14, bas, title="BB_Background4", color=enable_bb ? color.rgb(255, 152, 0, 100) : na)

volumeColor = close > close[1] ? color.new(#26A69A, 50) : color.new(#EF5350, 50)
plot(real, title="Split Adjusted Volume", style=plot.style_columns, color=volumeColor)
`,
    },
    {
        id: 'sochan-band-mcap-ratio',
        label: 'Sochan Band MCAP/AUM Ratio',
        description: 'Sochan Band with short-value normalized by market cap for stocks or AUM for funds.',
        warmupBars: 260,
        code: `//@version=5
indicator(title="Short Volume + Half Bollinger Band(Sochan Band MCAP/AUM)", shorttitle="SochanBandRatio", overlay=false)

enable_split_adjustment = input.bool(false, "Enable Split Adjustment", group="Split Adjustment")
manual_adjustment = input.float(1.0, "Manual Adjustment Factor", minval=0.00001, step=0.01, group="Split Adjustment")
use_manual = input.bool(false, "Use Manual Adjustment", group="Split Adjustment")

enable_bb = input.bool(true, "Enable Bollinger Band", group="BB")
length = input.int(240, minval=1, group="BB")
src_bb = input.string("Standard Deviation", "Band Source", options=["Standard Deviation", "mult"], group="BB") == "Standard Deviation"

mult1 = input.float(1.0, minval=0.001, maxval=50, title="BB#1 StdDev", group="BB")
mult2 = input.float(2.0, minval=0.001, maxval=50, title="BB#2 StdDev", group="BB")
mult3 = input.float(3.0, minval=0.001, maxval=50, title="BB#3 StdDev", group="BB")
mult4 = input.float(4.5, minval=0.001, maxval=50, title="BB#4 StdDev", group="BB")

offset = input.int(0, "Offset", minval=-500, maxval=500, group="BB")

sourceType = input.string("Short Value/MarketCap", "Source Type", options=["Short Volume", "Short Volume*Price", "Short Ratio", "Short Value/MarketCap"], group="Source")
priceType  = input.string("Close", "Price Source (for Value)", options=["Close", "Open", "High", "Low", "HL2", "HLC3", "OHLC4"], group="Source")
sumLength  = input.int(0, "Volume Sum Length", minval=0, maxval=500, group="Source")

isVolume      = sourceType == "Short Volume"
isVolumePrice = sourceType == "Short Volume*Price"
isRatio       = sourceType == "Short Ratio"
isMcapRatio   = sourceType == "Short Value/MarketCap"
isSum         = sumLength > 0

short_ticker = "FINRA:" + syminfo.ticker + "_SHORT_VOLUME"

f_price() =>
    switch priceType
        "Close"  => close
        "Open"   => open
        "High"   => high
        "Low"    => low
        "HL2"    => hl2
        "HLC3"   => hlc3
        "OHLC4"  => ohlc4
        => close

priceSrc = f_price()

isFund = syminfo.type == "fund"
financialId = isFund ? "AUM" : "TOTAL_SHARES_OUTSTANDING"
financialValue = request.financial(syminfo.tickerid, financialId, isFund ? "D" : "FQ")

f_get_denom(p) =>
    isFund ? financialValue : not na(financialValue) and not na(p) ? financialValue * p : na

splitNumerator = request.splits(syminfo.tickerid, splits.numerator, barmerge.gaps_on)
splitDenominator = request.splits(syminfo.tickerid, splits.denominator, barmerge.gaps_on)
splitRatio = not na(splitNumerator) and not na(splitDenominator) and splitNumerator != 0 ? splitDenominator / splitNumerator : na

var float cumulative_adjustment = 1.0
if enable_split_adjustment and not na(splitRatio)
    cumulative_adjustment := cumulative_adjustment * splitRatio

source_tf = request.security(short_ticker, timeframe.period, close, barmerge.gaps_on)
adjusted_source_tf = enable_split_adjustment ? source_tf * cumulative_adjustment / (use_manual ? manual_adjustment : 1.0) : source_tf

real_tf = isVolume      ? adjusted_source_tf :
          isVolumePrice ? adjusted_source_tf * priceSrc :
          isMcapRatio   ? adjusted_source_tf * priceSrc :
          isRatio       ? adjusted_source_tf / volume :
          na

real = isSum ? math.sum(real_tf, sumLength) / (isRatio ? sumLength : 1.0) : real_tf

if isMcapRatio
    denom = f_get_denom(priceSrc)
    real := not na(denom) and denom != 0 ? real / denom : na

basis = enable_bb ? ta.sma(real, length) : na
x = enable_bb ? (src_bb ? ta.stdev(real, length) : ta.sma(real, length)) : na

upper1 = enable_bb ? basis + mult1 * x : na
upper2 = enable_bb ? basis + mult2 * x : na
upper3 = enable_bb ? basis + mult3 * x : na
upper4 = enable_bb ? basis + mult4 * x : na

bas = plot(basis, "Basis", color=enable_bb ? #FF6D00 : na, offset=offset)
p11 = plot(upper1, "BB_Upper1", color=enable_bb ? #4caf50 : na, offset=offset)
fill(p11, bas, title="BB_Background1", color=enable_bb ? color.rgb(76, 175, 80, 100) : na)

p12 = plot(upper2, "BB_Upper2", color=enable_bb ? #ffeb3b : na, offset=offset)
fill(p12, bas, title="BB_Background2", color=enable_bb ? color.rgb(255, 235, 59, 100) : na)

p13 = plot(upper3, "BB_Upper3", color=enable_bb ? #f44336 : na, offset=offset)
fill(p13, bas, title="BB_Background3", color=enable_bb ? color.rgb(244, 67, 54, 100) : na)

p14 = plot(upper4, "BB_Upper4", color=enable_bb ? #ff9800 : na, offset=offset)
fill(p14, bas, title="BB_Background4", color=enable_bb ? color.rgb(255, 152, 0, 100) : na)

volumeColor = real >= nz(real[1]) ? color.new(#26A69A, 50) : color.new(#EF5350, 50)
plot(real, title="Short Value / MCAP-AUM", style=plot.style_columns, color=volumeColor)
`,
    },
    {
        id: 'financial-assets-composite',
        label: 'Financial Assets Composite',
        description: 'Total assets and total equity composite with optional smoothing and moving averages.',
        code: `//@version=5
indicator("Financial Assets Composite", "Financial Assets", overlay=false, max_lines_count=500, format=format.volume, precision=2)

period = input.string("FQ", "Period (applies to ALL)", options=["FQ", "FH", "FY"], group="Common")

showAssets = input.bool(true, "Show Total Assets", group="Visibility")
showEquity = input.bool(true, "Show Total Equity (Net Assets)", group="Visibility")

applySmooth = input.bool(false, "Apply smoothing to ALL series", group="Smoothing (Global)")
smoothType = input.string("EMA", "Smoothing type", options=["EMA", "SMA"], group="Smoothing (Global)")
smoothLen = input.int(3, "Smoothing length", minval=1, group="Smoothing (Global)")

maType = input.string("SMA", "MA type", options=["SMA", "EMA"], group="Moving Averages (Global)")
showShortMA = input.bool(false, "Show short MA", group="Moving Averages (Global)")
shortLen = input.int(20, "Short MA length", minval=1, group="Moving Averages (Global)")
showLongMA = input.bool(false, "Show long MA", group="Moving Averages (Global)")
longLen = input.int(100, "Long MA length", minval=1, group="Moving Averages (Global)")

cAssets = input.color(color.rgb(60, 120, 230), "Total Assets", group="Theme Colors")
cEquity = input.color(color.rgb(235, 140, 60), "Total Equity", group="Theme Colors")

f_fin(finId) =>
    request.financial(syminfo.tickerid, finId, period, barmerge.gaps_off, true)

f_ma(src, len) =>
    maType == "EMA" ? ta.ema(src, len) : ta.sma(src, len)

f_smooth(x) =>
    applySmooth ? (smoothType == "EMA" ? ta.ema(x, smoothLen) : ta.sma(x, smoothLen)) : x

f_clamp255(v) =>
    math.min(255.0, math.max(0.0, v))

f_lerp(a, b, t) =>
    a + (b - a) * t

f_blend(a, b, t) =>
    r = f_lerp(color.r(a), color.r(b), t)
    g = f_lerp(color.g(a), color.g(b), t)
    bl = f_lerp(color.b(a), color.b(b), t)
    color.rgb(int(math.round(f_clamp255(r))), int(math.round(f_clamp255(g))), int(math.round(f_clamp255(bl))), 0)

shortMAColor(base) =>
    f_blend(base, color.white, 0.22)

longMAColor(base) =>
    f_blend(base, color.black, 0.22)

mainStyle = applySmooth ? plot.style_line : plot.style_stepline

assetsRaw = f_fin("TOTAL_ASSETS")
equityRaw = f_fin("TOTAL_EQUITY")

totalAssets = f_smooth(assetsRaw)
totalEquity = f_smooth(equityRaw)

assetsS = f_ma(totalAssets, shortLen)
assetsL = f_ma(totalAssets, longLen)
equityS = f_ma(totalEquity, shortLen)
equityL = f_ma(totalEquity, longLen)

plot(showAssets ? totalAssets : na, "Total Assets", cAssets, linewidth=2, style=mainStyle)
plot(showAssets and showShortMA ? assetsS : na, "Total Assets — Short MA", shortMAColor(cAssets), linewidth=1)
plot(showAssets and showLongMA ? assetsL : na, "Total Assets — Long MA", longMAColor(cAssets), linewidth=1)

plot(showEquity ? totalEquity : na, "Total Equity", cEquity, linewidth=2, style=mainStyle)
plot(showEquity and showShortMA ? equityS : na, "Total Equity — Short MA", shortMAColor(cEquity), linewidth=1)
plot(showEquity and showLongMA ? equityL : na, "Total Equity — Long MA", longMAColor(cEquity), linewidth=1)
`,
    },
    {
        id: 'financial-returns-composite',
        label: 'Financial Returns Composite',
        description: 'ROA, ROE, and ROTE composite with optional smoothing and moving averages.',
        code: `//@version=5
indicator("Financial Returns Composite", "Financial Returns", overlay=false, max_lines_count=500, format=format.percent, precision=2)

period = input.string("FQ", "Period (applies to ALL)", options=["FQ", "FH", "FY"], group="Common")

showROA = input.bool(true, "Show ROA", group="Visibility")
showROE = input.bool(true, "Show ROE", group="Visibility")
showROTE = input.bool(true, "Show ROTE (Tangible ROE)", group="Visibility")

applySmooth = input.bool(false, "Apply smoothing to ALL series", group="Smoothing (Global)")
smoothType = input.string("EMA", "Smoothing type", options=["EMA", "SMA"], group="Smoothing (Global)")
smoothLen = input.int(3, "Smoothing length", minval=1, group="Smoothing (Global)")

maType = input.string("SMA", "MA type", options=["SMA", "EMA"], group="Moving Averages (Global)")
showShortMA = input.bool(false, "Show short MA", group="Moving Averages (Global)")
shortLen = input.int(20, "Short MA length", minval=1, group="Moving Averages (Global)")
showLongMA = input.bool(false, "Show long MA", group="Moving Averages (Global)")
longLen = input.int(100, "Long MA length", minval=1, group="Moving Averages (Global)")

cROA = input.color(color.rgb(70, 180, 120), "ROA", group="Theme Colors")
cROE = input.color(color.rgb(160, 90, 220), "ROE", group="Theme Colors")
cROTE = input.color(color.rgb(230, 80, 90), "ROTE", group="Theme Colors")

f_fin(finId) =>
    request.financial(syminfo.tickerid, finId, period, barmerge.gaps_off, true)

f_ma(src, len) =>
    maType == "EMA" ? ta.ema(src, len) : ta.sma(src, len)

f_smooth(x) =>
    applySmooth ? (smoothType == "EMA" ? ta.ema(x, smoothLen) : ta.sma(x, smoothLen)) : x

f_clamp255(v) =>
    math.min(255.0, math.max(0.0, v))

f_lerp(a, b, t) =>
    a + (b - a) * t

f_blend(a, b, t) =>
    r = f_lerp(color.r(a), color.r(b), t)
    g = f_lerp(color.g(a), color.g(b), t)
    bl = f_lerp(color.b(a), color.b(b), t)
    color.rgb(int(math.round(f_clamp255(r))), int(math.round(f_clamp255(g))), int(math.round(f_clamp255(bl))), 0)

shortMAColor(base) =>
    f_blend(base, color.white, 0.22)

longMAColor(base) =>
    f_blend(base, color.black, 0.22)

mainStyle = applySmooth ? plot.style_line : plot.style_stepline

roaRaw = f_fin("RETURN_ON_ASSETS")
roeRaw = f_fin("RETURN_ON_EQUITY")
roteRaw = f_fin("RETURN_ON_TANG_EQUITY")

roa = f_smooth(roaRaw)
roe = f_smooth(roeRaw)
rote = f_smooth(roteRaw)

roaS = f_ma(roa, shortLen)
roaL = f_ma(roa, longLen)
roeS = f_ma(roe, shortLen)
roeL = f_ma(roe, longLen)
roteS = f_ma(rote, shortLen)
roteL = f_ma(rote, longLen)

plot(showROA ? roa : na, "ROA", cROA, linewidth=2, style=mainStyle)
plot(showROA and showShortMA ? roaS : na, "ROA — Short MA", shortMAColor(cROA), linewidth=1)
plot(showROA and showLongMA ? roaL : na, "ROA — Long MA", longMAColor(cROA), linewidth=1)

plot(showROE ? roe : na, "ROE", cROE, linewidth=2, style=mainStyle)
plot(showROE and showShortMA ? roeS : na, "ROE — Short MA", shortMAColor(cROE), linewidth=1)
plot(showROE and showLongMA ? roeL : na, "ROE — Long MA", longMAColor(cROE), linewidth=1)

plot(showROTE ? rote : na, "ROTE", cROTE, linewidth=2, style=mainStyle)
plot(showROTE and showShortMA ? roteS : na, "ROTE — Short MA", shortMAColor(cROTE), linewidth=1)
plot(showROTE and showLongMA ? roteL : na, "ROTE — Long MA", longMAColor(cROTE), linewidth=1)
`,
    },
];
