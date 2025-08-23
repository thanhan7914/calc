// Tìm nghiệm nguyên dương x s.t. sum(a[i]*x[i]) gần m nhất,
// trong các nghiệm có |err| tối thiểu chọn nghiệm "cân" nhất.
// Trả về { x, achieved, err }.
function balancedMinError(a, m) {
  const n = a.length;
  if (n === 0) return null;

  const sumA = a.reduce((s, v) => s + v, 0);
  const minSum = sumA; // khi mọi x_i = 1
  if (m <= minSum) {
    return { x: Array(n).fill(1), achieved: minSum, err: minSum - m };
  }

  const R0 = m - minSum; // phần cần bù bằng counts t_i (x_i = 1 + t_i)
  const maxA = Math.max(...a);
  const Rlimit = R0 + maxA; // cho phép overshoot 1 đồng lớn nhất

  // bảo vệ an toàn nếu Rlimit quá lớn
  const MEM_BYTES = (Rlimit + 1) * n * 4;
  if (MEM_BYTES > 600 * 1024 * 1024) {
    // ~600MB threshold
    console.warn(
      "Rlimit quá lớn — bộ nhớ có thể không đủ. Hãy cân nhắc tối ưu khác."
    );
  }

  // dp[s] = 1 nếu tổng s khả dĩ; countsFlat lưu counts cho mỗi s liên tiếp (Int32Array)
  const dp = new Uint8Array(Rlimit + 1);
  const countsFlat = new Int32Array((Rlimit + 1) * n);
  dp[0] = 1; // tổng 0 bằng không lấy đồng nào

  // helper: compute metric (primary = max-min, secondary = sumsq) for counts starting at offset
  function metricAt(offset) {
    let mn = Infinity,
      mx = -Infinity,
      sumsq = 0;
    for (let k = 0; k < n; k++) {
      const v = countsFlat[offset + k];
      if (v < mn) mn = v;
      if (v > mx) mx = v;
      sumsq += v * v;
    }
    return [mx - mn, sumsq];
  }

  // DP forward: unbounded knapsack; for each reachable s try add each coin a[i]
  for (let s = 0; s <= Rlimit; s++) {
    if (!dp[s]) continue;
    const baseOff = s * n;
    for (let i = 0; i < n; i++) {
      const ns = s + a[i];
      if (ns > Rlimit) continue;
      const nsOff = ns * n;
      if (!dp[ns]) {
        // copy countsFlat[baseOff..baseOff+n-1] -> countsFlat[nsOff..]
        for (let k = 0; k < n; k++) {
          countsFlat[nsOff + k] = countsFlat[baseOff + k];
        }
        countsFlat[nsOff + i] += 1;
        dp[ns] = 1;
      } else {
        // dp[ns] đã có 1 biểu diễn, ta so sánh biểu diễn hiện tại với candidate (base + coin i)
        // tính metric cho existing
        let existingPrimary = 0,
          existingSecondary = 0;
        {
          let mn = Infinity,
            mx = -Infinity,
            sumsq = 0;
          for (let k = 0; k < n; k++) {
            const v = countsFlat[nsOff + k];
            if (v < mn) mn = v;
            if (v > mx) mx = v;
            sumsq += v * v;
          }
          existingPrimary = mx - mn;
          existingSecondary = sumsq;
        }
        // tính metric cho candidate mà không copy trước
        let cMn = Infinity,
          cMx = -Infinity,
          cSsq = 0;
        for (let k = 0; k < n; k++) {
          const v = countsFlat[baseOff + k] + (k === i ? 1 : 0);
          if (v < cMn) cMn = v;
          if (v > cMx) cMx = v;
          cSsq += v * v;
        }
        const candPrimary = cMx - cMn;
        const candSecondary = cSsq;

        // nếu candidate "cân" hơn (nhỏ hơn lexicographically), thay thế
        if (
          candPrimary < existingPrimary ||
          (candPrimary === existingPrimary && candSecondary < existingSecondary)
        ) {
          for (let k = 0; k < n; k++) {
            countsFlat[nsOff + k] = countsFlat[baseOff + k];
          }
          countsFlat[nsOff + i] += 1;
        }
      }
    }
  }

  // Tìm best_s: minimize |s - R0|, tie-break bằng metric (primary then secondary)
  let best_s = -1;
  let bestErrAbs = Infinity;
  let bestPrimary = Infinity;
  let bestSecondary = Infinity;

  for (let s = 0; s <= Rlimit; s++) {
    if (!dp[s]) continue;
    const errAbs = Math.abs(s - R0);
    const off = s * n;
    let mn = Infinity,
      mx = -Infinity,
      sumsq = 0;
    for (let k = 0; k < n; k++) {
      const v = countsFlat[off + k];
      if (v < mn) mn = v;
      if (v > mx) mx = v;
      sumsq += v * v;
    }
    const primary = mx - mn;
    const secondary = sumsq;

    if (
      errAbs < bestErrAbs ||
      (errAbs === bestErrAbs &&
        (primary < bestPrimary ||
          (primary === bestPrimary && secondary < bestSecondary)))
    ) {
      bestErrAbs = errAbs;
      best_s = s;
      bestPrimary = primary;
      bestSecondary = secondary;
    }
  }

  if (best_s === -1) return null;

  // reconstruct x = 1 + counts
  const resultCounts = new Array(n);
  const offBest = best_s * n;
  for (let k = 0; k < n; k++) resultCounts[k] = countsFlat[offBest + k];
  const x = resultCounts.map((c) => 1 + c);
  const achieved = minSum + best_s;
  const err = achieved - m;
  return { x, achieved, err };
}
