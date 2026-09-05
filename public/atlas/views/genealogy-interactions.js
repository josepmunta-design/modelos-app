// SVG card expansion and influence behavior retained from the original Genealogy.
// The Atlas owns data, navigation and the single shared profile.
import { text } from '../ui.js';
export function createInteractions({world, main, ALL, EDGES, colorOf, schoolLabel, crossEnabled, openDetail, travelToNode}) {
const CARDW=168, FALLBACK='#98a0ad';
let pinnedNodeId=null, expandedContext=null, expandedSameSchoolContext=null;
function buildSubContent(subEl,maxChars){
  const NS='http://www.w3.org/2000/svg';
  const year=subEl.dataset.year||'';
  const rest=subEl.dataset.rest||'';
  const avail=Math.max(0,maxChars-(year?year.length+3:0));
  let restTxt=rest;
  if(restTxt.length>avail) restTxt=avail>1?restTxt.slice(0,avail-1)+'…':'';
  subEl.textContent='';
  if(year){
    const ts=document.createElementNS(NS,'tspan');
    ts.setAttribute('class','tsub-year');
    ts.setAttribute('fill',subEl.dataset.col||'currentColor');
    ts.textContent=year;
    subEl.appendChild(ts);
    if(restTxt) subEl.appendChild(document.createTextNode(' · '+restTxt));
  }else{
    subEl.textContent=restTxt||'';
  }
}

function setSubWidth(g,width){
  const sub=g.querySelector('.tsub');
  if(!sub) return;
  buildSubContent(sub,Math.floor((width-31)/5.4));
}

function neighborsOf(id){
  // todas las influencias (entrantes y salientes), incluidas las que cruzan de escuela
  const set=new Set([id]);
  EDGES.forEach(e=>{
    if(e.from===id) set.add(e.to);
    if(e.to===id)   set.add(e.from);
  });
  return set;
}

function isSameSchoolInfluence(sourceId,targetId){
  const source=ALL[sourceId], target=ALL[targetId];
  if(!source||!target||source._school!==target._school) return false;
  return EDGES.some(e=>(e.from===sourceId&&e.to===targetId)||
                       (e.to===sourceId&&e.from===targetId));
}

function fitSvgText(el,value,maxWidth){
  el.textContent=value;
  if(el.getComputedTextLength()<=maxWidth) return value;
  let lo=0,hi=value.length;
  while(lo<hi){
    const mid=Math.ceil((lo+hi)/2);
    el.textContent=value.slice(0,mid)+'…';
    if(el.getComputedTextLength()<=maxWidth) lo=mid;
    else hi=mid-1;
  }
  el.textContent=value.slice(0,lo)+'…';
  return el.textContent;
}

function expandInfluenceCard(card,rect,label,fullLabel,baseWidth,inbound){
  clearTimeout(label._collapseTimer);
  clearTimeout(label._expandTimer);
  label.textContent=fullLabel;
  const width=Math.max(baseWidth,Math.ceil(label.getComputedTextLength()+18));
  label.textContent=label.dataset.shortLabel;
  const extra=width-baseWidth;
  card._expanded=true;
  requestAnimationFrame(()=>{
    rect.style.width=width+'px';
    card.style.transform=inbound?`translateX(${-extra}px)`:'translateX(0)';
  });
  label._expandTimer=setTimeout(()=>{
    if(card._expanded) label.textContent=fullLabel;
  },220);
}

function collapseInfluenceCard(card,rect,label,shortLabel,baseWidth){
  clearTimeout(label._collapseTimer);
  clearTimeout(label._expandTimer);
  card._expanded=false;
  label.textContent=shortLabel;
  rect.style.width=baseWidth+'px';
  card.style.transform='translateX(0)';
}

function showCrossInfluences(id,ctx){
  world.querySelectorAll('.cross-layer').forEach(g=>g.remove());
  world.querySelectorAll('.school.cross-active').forEach(s=>s.classList.remove('cross-active'));
  if(!ctx || !crossEnabled()) return;
  const selected=ALL[id];
  const links=EDGES.filter(e=>(e.to===id && e.fromS!==selected._school) ||
                              (e.from===id && e.toS!==selected._school));
  const extIn=(selected.extAsc||[]).map(name=>({external:name}));
  const extOut=(selected.extDesc||[]).map(name=>({external:name}));
  if(!links.length&&!extIn.length&&!extOut.length) return;
  ctx.svg.closest('.school')?.classList.add('cross-active');

  const NS='http://www.w3.org/2000/svg';
  const layer=document.createElementNS(NS,'g');
  layer.setAttribute('class','cross-layer');
  if(pinnedNodeId===id) layer.classList.add('pinned-cross');
  const lineGroup=document.createElementNS(NS,'g');
  const cardGroup=document.createElementNS(NS,'g');
  layer.append(lineGroup,cardGroup);
  ctx.svg.appendChild(layer);

  const externalW=190, rowGap=48;
  const selectedW=ctx.node._displayW||CARDW;
  // Las influencias externas al repo van al final de cada columna, en tono neutro.
  const EXTERNAL_COL='#98a0ad';
  const columns=[
    {inbound:true, items:links.filter(e=>e.to===id).map(edge=>({edge})).concat(extIn),
      x:ctx.node._x-externalW-56},
    {inbound:false,items:links.filter(e=>e.from===id).map(edge=>({edge})).concat(extOut),
      x:ctx.node._x+selectedW+56}
  ];
  columns.forEach(column=>{
    const total=(column.items.length-1)*rowGap;
    const start=Math.max(24,ctx.node._y-total/2);
    column.items.forEach((item,i)=>{
      const external=!item.edge;
      const other=external?null:ALL[column.inbound?item.edge.from:item.edge.to];
      if(!external&&!other) return;
      const y=start+i*rowGap;
      const col=external?EXTERNAL_COL:(colorOf[other._school]||FALLBACK);

      const path=document.createElementNS(NS,'path');
      const fromX=column.inbound?column.x+externalW:ctx.node._x+selectedW;
      const toX=column.inbound?ctx.node._x:column.x;
      const fromY=column.inbound?y:ctx.node._y;
      const toY=column.inbound?ctx.node._y:y;
      const bend=(fromX+toX)/2;
      path.setAttribute('d',`M ${fromX} ${fromY} C ${bend} ${fromY}, ${bend} ${toY}, ${toX} ${toY}`);
      path.setAttribute('class','cross-link'+(external?' external':''));
      path.setAttribute('stroke',col);
      lineGroup.appendChild(path);

      const card=document.createElementNS(NS,'g');
      card.setAttribute('class','cross-card'+(external?' external':''));
      if(!external){ card.setAttribute('role','button'); card.setAttribute('tabindex','0'); card.dataset.modelId=other.id; card.setAttribute('aria-label',other.label); card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();travelToNode(other.id);}}); }
      const rect=document.createElementNS(NS,'rect');
      rect.setAttribute('class','cross-card-bg');
      rect.setAttribute('x',column.x); rect.setAttribute('y',y-19);
      rect.setAttribute('width',externalW); rect.setAttribute('height',38); rect.setAttribute('rx',11);
      rect.style.width=externalW+'px';
      rect.setAttribute('fill','var(--genealogy-card)'); rect.setAttribute('stroke',col);
      rect.setAttribute('stroke-opacity',external?'.35':'.6'); rect.setAttribute('stroke-width','1');
      card.appendChild(rect);
      const kicker=document.createElementNS(NS,'text');
      kicker.setAttribute('class','cross-kicker'+(external?' external':'')); kicker.setAttribute('x',column.x+9); kicker.setAttribute('y',y-5);
      const kickerText=(column.inbound?text('INFLUENCIA ENTRANTE · ','INCOMING INFLUENCE · '):text('INFLUENCIA SALIENTE · ','OUTGOING INFLUENCE · '))+(external?text('EXTERNA','EXTERNAL'):schoolLabel[other._school]);
      kicker.textContent=kickerText;
      card.appendChild(kicker);
      const label=document.createElementNS(NS,'text');
      label.setAttribute('class','cross-label'+(external?' external':'')); label.setAttribute('x',column.x+9); label.setAttribute('y',y+11);
      const labelText=external?item.external:other.label+(other.year?' · '+other.year:'');
      // plegada: abreviatura si existe; desplegada (hover): nombre completo
      const compactText=external?item.external:(other.tl||other.label)+(other.year?' · '+other.year:'');
      label.textContent=compactText; card.appendChild(label);
      const title=document.createElementNS(NS,'title');
      title.textContent=kickerText+' — '+labelText; card.appendChild(title);
      cardGroup.appendChild(card);
      fitSvgText(kicker,kickerText,externalW-18);
      const shortLabel=fitSvgText(label,compactText,externalW-18);
      label.dataset.fullLabel=labelText;
      label.dataset.shortLabel=shortLabel;
      card.addEventListener('mouseenter',()=>{
        if(pinnedNodeId!==id) return;
        expandInfluenceCard(card,rect,label,labelText,externalW,column.inbound);
      });
      card.addEventListener('mouseleave',()=>{
        if(pinnedNodeId!==id) return;
        collapseInfluenceCard(card,rect,label,shortLabel,externalW);
      });
      card.addEventListener('click',e=>{
        if(pinnedNodeId!==id||main._suppressClick) return;
        // las externas no llevan a ningún nodo: se traga el clic para que no
        // llegue al fondo y despine las influencias del nodo madre
        e.stopPropagation();
        if(!external) travelToNode(other.id);
      });
    });
  });
}

function hoverNode(id,ctx){
  const near=neighborsOf(id);
  world.querySelectorAll('.tnode').forEach(g=>{
    const nid=g.dataset.id;
    const on=near.has(nid);
    g.classList.toggle('dim', !on);
    g.classList.toggle('lit', nid===id);
  });
  world.querySelectorAll('.tedge').forEach(p=>{
    const on=(p.dataset.child===id||p.dataset.parent===id);
    p.classList.toggle('lit', on);
    p.classList.toggle('dim', !on);
  });
  showCrossInfluences(id,ctx);
}

function collapseExpandedNode(){
  if(!expandedContext) return;
  const old=expandedContext;
  expandedContext=null;
  old.node._displayW=CARDW;
  const rect=old.g.querySelector('.node-card');
  const label=old.g.querySelector('.tlabel');
  clearTimeout(label._collapseTimer);
  clearTimeout(label._expandTimer);
  label.textContent=label.dataset.shortLabel;
  setSubWidth(old.g,CARDW);
  rect.style.width=CARDW+'px';
}

function expandPinnedNode(ctx,bringToFront=true){
  collapseExpandedNode();
  const rect=ctx.g.querySelector('.node-card');
  const label=ctx.g.querySelector('.tlabel');
  clearTimeout(label._collapseTimer);
  clearTimeout(label._expandTimer);
  label.textContent=label.dataset.fullLabel;
  const leftPad=23;
  const width=Math.max(CARDW,Math.ceil(leftPad+label.getComputedTextLength()+14));
  label.textContent=label.dataset.shortLabel;
  ctx.node._displayW=width;
  expandedContext=ctx;
  if(bringToFront) ctx.g.parentNode.appendChild(ctx.g);
  requestAnimationFrame(()=>{
    if(expandedContext===ctx) rect.style.width=width+'px';
  });
  label._expandTimer=setTimeout(()=>{
    if(expandedContext===ctx){
      label.textContent=label.dataset.fullLabel;
      setSubWidth(ctx.g,width);
    }
  },220);
}

function expandSameSchoolInfluence(ctx){
  if(expandedSameSchoolContext===ctx) return;
  collapseSameSchoolInfluence();
  const rect=ctx.g.querySelector('.node-card');
  const label=ctx.g.querySelector('.tlabel');
  clearTimeout(label._collapseTimer);
  clearTimeout(label._expandTimer);
  label.textContent=label.dataset.fullLabel;
  const leftPad=23;
  const width=Math.max(CARDW,Math.ceil(leftPad+label.getComputedTextLength()+14));
  label.textContent=label.dataset.shortLabel;
  expandedSameSchoolContext=ctx;
  requestAnimationFrame(()=>{ rect.style.width=width+'px'; });
  label._expandTimer=setTimeout(()=>{
    if(expandedSameSchoolContext===ctx){
      label.textContent=label.dataset.fullLabel;
      setSubWidth(ctx.g,width);
    }
  },220);
}

function collapseSameSchoolInfluence(){
  if(!expandedSameSchoolContext) return;
  const old=expandedSameSchoolContext;
  expandedSameSchoolContext=null;
  const rect=old.g.querySelector('.node-card');
  const label=old.g.querySelector('.tlabel');
  clearTimeout(label._collapseTimer);
  clearTimeout(label._expandTimer);
  label.textContent=label.dataset.shortLabel;
  setSubWidth(old.g,CARDW);
  rect.style.width=CARDW+'px';
}

function removeOpenFichaBtn(){
  world.querySelectorAll('.open-ficha-btn').forEach(g=>g.remove());
}

function showOpenFichaBtn(id,ctx){
  removeOpenFichaBtn();
  const NS='http://www.w3.org/2000/svg';
  const w=92,h=26;
  const cardW=ctx.node._displayW||CARDW;
  const x=ctx.node._x+cardW/2-w/2;
  const y=ctx.node._y+ctx.L.CARDH/2+9;
  const btn=document.createElementNS(NS,'g');
  btn.setAttribute('class','open-ficha-btn');
  btn.setAttribute('role','button'); btn.setAttribute('tabindex','0'); btn.setAttribute('aria-label',text('Abrir ficha','Open profile'));
  btn.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();openDetail(id);}});
  const rect=document.createElementNS(NS,'rect');
  rect.setAttribute('x',x); rect.setAttribute('y',y);
  rect.setAttribute('width',w); rect.setAttribute('height',h); rect.setAttribute('rx',13);
  btn.appendChild(rect);
  const label=document.createElementNS(NS,'text');
  label.setAttribute('x',x+w/2); label.setAttribute('y',y+h/2+3.5);
  label.setAttribute('text-anchor','middle');
  label.textContent=text('Abrir ficha','Open profile');
  btn.appendChild(label);
  btn.addEventListener('click',e=>{
    if(main._suppressClick) return;
    e.stopPropagation();
    openDetail(id);
  });
  ctx.g.appendChild(btn);
}

function pinHover(id,ctx){
  if(pinnedNodeId===id) return;
  removeOpenFichaBtn();
  collapseSameSchoolInfluence();
  pinnedNodeId=id;
  if(expandedContext===ctx){
    // El hover ya lo ha expandido: al fijarlo conservamos ancho y texto,
    // sin contraer y reproducir de nuevo la animaciÃ³n.
    ctx.g.parentNode.appendChild(ctx.g);
  }else{
    expandPinnedNode(ctx);
  }
  hoverNode(id,ctx);
}

function unpinHover(){
  if(!pinnedNodeId) return;
  pinnedNodeId=null;
  removeOpenFichaBtn();
  clearHover();
  collapseExpandedNode();
  collapseSameSchoolInfluence();
}

function clearHover(){
  world.querySelectorAll('.cross-layer').forEach(g=>g.remove());
  world.querySelectorAll('.school.cross-active').forEach(s=>s.classList.remove('cross-active'));
  world.querySelectorAll('.tnode').forEach(g=>g.classList.remove('dim','lit'));
  world.querySelectorAll('.tedge').forEach(p=>p.classList.remove('dim','lit'));
}
return { buildSubContent,
  pin(id,ctx){ pinHover(id,ctx); showOpenFichaBtn(id,ctx); },
  hover(id,ctx){ if(!pinnedNodeId){expandPinnedNode(ctx,false);hoverNode(id,ctx);} else if(id!==pinnedNodeId&&isSameSchoolInfluence(pinnedNodeId,id)) expandSameSchoolInfluence(ctx); },
  leave(ctx){ if(!pinnedNodeId){clearHover();if(expandedContext===ctx)collapseExpandedNode();} else if(expandedSameSchoolContext===ctx)collapseSameSchoolInfluence(); },
  clear(){ unpinHover();clearHover();collapseExpandedNode();collapseSameSchoolInfluence(); },
  get pinned(){return pinnedNodeId;},
};
}
