const dateLabel = new Intl.DateTimeFormat('tr-TR',{day:'numeric',month:'short',timeZone:'UTC'});
const weightLabel = new Intl.NumberFormat('tr-TR',{maximumFractionDigits:1});

export function drawWeightTrend(canvas,entries) {
  const ctx = canvas.getContext('2d');
  const {width,height} = canvas.getBoundingClientRect();
  if (!ctx || !width || !height || entries.length < 2) return;
  const ratio = Math.min(window.devicePixelRatio || 1,2);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  ctx.scale(ratio,ratio);
  ctx.font = '11px system-ui, sans-serif';
  const theme = getComputedStyle(canvas);
  const color = name => theme.getPropertyValue(`--chart-${name}`).trim();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const {min,max} = entries.reduce(({min,max},point) => ({
    min:Math.min(min,point.kg,point.average),
    max:Math.max(max,point.kg,point.average)
  }),{min:Infinity,max:-Infinity});
  const step = Math.max(0.5,Math.ceil((max - min) * 2 / 3) / 2);
  const low = Math.floor(min / step) * step - step / 2;
  const high = Math.ceil(max / step) * step + step / 2;
  const top = 10, bottom = height - 26;
  const right = width - 8;
  const left = Math.max(ctx.measureText(weightLabel.format(high)+' kg').width,ctx.measureText(weightLabel.format(low)+' kg').width) + 9;
  const begin = Date.parse(entries[0].date);
  const end = Date.parse(entries.at(-1).date);
  const x = time => left + (time - begin) / (end - begin) * (right - left);
  const y = value => bottom - (value - low) / (high - low) * (bottom - top);

  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color('label');
  ctx.strokeStyle = color('grid');
  ctx.lineWidth = 1;
  for (let value = Math.ceil(low / step) * step; value < high; value += step) {
    const line = y(value);
    ctx.beginPath();
    ctx.moveTo(left,line);
    ctx.lineTo(right,line);
    ctx.stroke();
    ctx.fillText(weightLabel.format(value)+' kg',left-7,line);
  }

  const points = entries.map(point => ({...point,x:x(Date.parse(point.date))}));
  const trace = key => {
    ctx.beginPath();
    ctx.moveTo(points[0].x,y(points[0][key]));
    for (const point of points.slice(1)) ctx.lineTo(point.x,y(point[key]));
  };
  trace('average');
  ctx.lineTo(right,bottom);
  ctx.lineTo(left,bottom);
  ctx.closePath();
  const gradient = ctx.createLinearGradient(0,top,0,bottom);
  gradient.addColorStop(0,`rgba(${color('area')},.19)`);
  gradient.addColorStop(1,`rgba(${color('area')},0)`);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.strokeStyle = color('measured');
  ctx.lineWidth = 1.4;
  ctx.setLineDash([3,4]);
  trace('kg');
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = color('average');
  ctx.lineWidth = 2.5;
  trace('average');
  ctx.stroke();
  ctx.fillStyle = color('dot');
  for (const point of points) {
    ctx.beginPath();
    ctx.arc(point.x,y(point.kg),2,0,Math.PI*2);
    ctx.fill();
  }

  ctx.fillStyle = color('label');
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillText(dateLabel.format(begin),left,bottom+9);
  if (right - left >= 190 && end - begin >= 4 * 86_400_000) {
    ctx.textAlign = 'center';
    const mid = Math.floor((begin + end) / 172_800_000) * 86_400_000;
    ctx.fillText(dateLabel.format(mid),x(mid),bottom+9);
  }
  ctx.textAlign = 'right';
  ctx.fillText(dateLabel.format(end),right,bottom+9);
}
