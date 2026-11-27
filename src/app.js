'use strict';
const A=JSON.parse(document.getElementById('atlas-data').textContent);
const P=Object.fromEntries(A.papers.map(p=>[p.id,p]));
const ALL=Object.fromEntries([...A.papers,...A.pending].map(p=>[p.id,p]));
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeURL=url=>/^https?:\/\//i.test(String(url||''))?esc(url):'';
const ext=(url,label,cls='')=>safeURL(url)?`<a class="${esc(cls)}" href="${safeURL(url)}" target="_blank" rel="noopener noreferrer">${esc(label)} <span aria-hidden="true">↗</span></a>`:'';
const paperButton=(id,label)=>`<button class="paper-link" data-open="${esc(id)}">${esc(label||P[id]?.short||ALL[id]?.title||id)}</button>`;
const accessNames={fulltext:'原文方法核查',abstract:'官方摘要核查',metadata:'题录核查',documentation:'官方文档核查',pending:'待重新核查'};
const typeNames={adopts:'方法采用',extends:'版本扩展',compares:'实验比较',cites:'引用关系'};
const axisNames=Object.fromEntries(A.axes.map(a=>[a.id,a.label]));
const badge=(p)=>`<span class="badge ${esc(p.access)}">${esc(accessNames[p.access]||p.access)}</span>`;
let readState={};
try{const raw=JSON.parse(localStorage.getItem('macro-atlas-read-v1')||'{}');readState=Array.isArray(raw)?Object.fromEntries(raw.map(id=>[id,true])):(raw&&typeof raw==='object'?raw:{});}catch(_){readState={};}
let state={matrix:A.defaults.matrix,graph:A.defaults.graph,mode:'reviewed',page:1,query:'',role:'all',access:'all',sort:'desc'};
let lastFocus=null;
const pageSize=12;
const readButton=id=>`<button class="paper-read ${readState[id]?'is-read':''}" data-read="${esc(id)}" aria-pressed="${!!readState[id]}">${readState[id]?'✓ 已阅读':'标记已读'}</button>`;
const headingNames={"基础表示与早期布局流程":"Foundations and Early Placement Flows","现代 Macro Placement 的三条交汇主线":"Modern Macro Placement","线长建模与估计":"Wirelength Modeling","拥塞模型、布线与评估":"Congestion, Routing and Evaluation","多端网展开与求解模型":"Multi-pin Net Models","几何线长估计":"Geometric Wirelength Estimation","连续优化的线长近似":"Smooth Wirelength Models","宏布局中的专门建模与实际评价":"Macro-specific Models and Routed Metrics","几何表示":"Geometric Representation","连接关系建模":"Connectivity Modeling","区域与面积分配":"Region and Area Allocation","优化与搜索":"Optimization and Search","几何合法化":"Legalization","线长建模":"Wirelength Modeling","评价与验证":"Evaluation and Validation"};
const headingName=s=>headingNames[s]||s;
function renderTimeline(){
 const container=$('history-atlas');
 if(!container)return;
 container.innerHTML=A.timeline.map(group=>{
   const nodes=new Set(group.lanes.flatMap(l=>l.ids));
   const periodTitle=([a,b])=>a===b?String(a):a+'–'+b;
   const headers='<th scope="col" class="history-track-heading">研究方向</th>'+group.periods.map(p=>'<th scope="col">'+esc(periodTitle(p))+'</th>').join('');
   const rows=group.lanes.map(lane=>'<tr><th scope="row" class="history-track">'+esc(lane.label)+'</th>'+group.periods.map(([from,to])=>{
     const ps=lane.ids.map(id=>P[id]).filter(p=>p.year>=from&&p.year<=to).sort((a,b)=>a.year-b.year||a.short.localeCompare(b.short));
     return '<td>'+ps.map(p=>'<button class="history-paper" data-open="'+esc(p.id)+'"><span class="history-paper-year">'+esc(p.year)+'</span><strong>'+esc(p.short)+'</strong><small>'+esc(p.access==='abstract'?'摘要核查':p.access==='fulltext'?'原文核查':accessNames[p.access])+'</small></button>').join('')+'</td>';
   }).join('')+'</tr>').join('');
   const edges=A.relations.filter(r=>nodes.has(r.from)&&nodes.has(r.to)&&(r.type==='adopts'||r.type==='extends'));
   const links=edges.length?'<details class="history-evidence"><summary>本区段已核实的方法采用或版本扩展（'+edges.length+' 条）</summary><div>'+edges.map(r=>'<div class="history-edge">'+paperButton(r.from)+'<span class="history-arrow"> → </span>'+paperButton(r.to)+'<span class="history-component">'+esc(r.component)+' · '+esc(typeNames[r.type])+'</span><a href="'+safeURL(r.url)+'" target="_blank" rel="noopener noreferrer">'+esc(r.locator)+'</a></div>').join('')+'</div></details>':'';
   return '<article class="history-block"><div class="history-heading"><div><div class="eyebrow">'+esc(group.range)+'</div><h3>'+esc(headingName(group.title))+'</h3></div></div><p class="history-note">'+esc(group.note)+'</p><div class="history-scroll" tabindex="0" role="region" aria-label="'+esc(group.title)+' 年代对照表"><table class="history-table" style="min-width:'+String(155+group.periods.length*142)+'px"><thead><tr>'+headers+'</tr></thead><tbody>'+rows+'</tbody></table></div>'+links+'</article>';
 }).join('');
}
function renderWirelength(){
 const el=$('wirelength-models');if(!el)return;
 el.innerHTML=A.wirelengthModels.map(g=>'<article class="wire-model-group"><h3>'+esc(headingName(g.category))+'</h3><p class="history-note">'+esc(g.description)+'</p><div class="table-frame"><table class="wire-model-table"><thead><tr><th scope="col">模型</th><th scope="col">数学形式 / 定义</th><th scope="col">用途</th><th scope="col">限制及文献</th></tr></thead><tbody>'+g.models.map(m=>'<tr><th scope="row">'+esc(m.name)+'</th><td class="wire-formula">'+esc(m.formula)+'</td><td>'+esc(m.purpose)+'</td><td>'+esc(m.limit)+'<div class="wire-refs">'+m.papers.map(id=>paperButton(id)).join('')+'</div></td></tr>').join('')+'</tbody></table></div></article>').join('');
}
function initial(){
 const full=A.papers.filter(p=>p.access==='fulltext').length;
 $('coverage').innerHTML=[[A.papers.length,'本次核查记录'],[full,'原文方法核查'],[A.relations.length,'有定位的关系'],[A.pending.length,'待核查索引']].map(([n,t])=>`<div class="stat"><strong>${n}</strong><span>${t}</span></div>`).join('');
 $('coverage-note').textContent=`核查范围：${full} 条原文方法记录、${A.papers.filter(p=>p.access==='abstract').length} 条摘要记录、${A.papers.filter(p=>p.access==='metadata').length} 条题录记录、${A.papers.filter(p=>p.access==='documentation').length} 条官方文档。已核查记录包括基础方法及分开的出版版本；其余 ${A.pending.length} 条旧索引保留为检索线索。`;
 $('axes').innerHTML=A.axes.map(a=>`<article class="axis"><div class="axis-top"><span class="axis-code">${esc(a.number)}</span><h3>${esc(headingName(a.label))}</h3></div><p>${esc(a.definition)}</p><div class="axis-examples">${a.examples.map(e=>`<button class="chip" data-open="${esc(e.paper)}">${esc(e.label)}</button>`).join('')}</div><div class="axis-boundary">${esc(a.boundary)}</div></article>`).join('');
 $('matrix-tabs').innerHTML=A.matrixGroups.map(g=>`<button data-matrix="${esc(g.id)}" aria-pressed="${g.id===state.matrix}">${esc(g.label)}</button>`).join('');
 const relIDs=new Set(A.relations.flatMap(r=>[r.from,r.to]));
 $('graph-focus').innerHTML=A.papers.filter(p=>relIDs.has(p.id)).sort((a,b)=>(b.year||9999)-(a.year||9999)||a.id.localeCompare(b.id)).map(p=>`<option value="${esc(p.id)}" ${p.id===state.graph?'selected':''}>${p.year||'文档'} · ${esc(p.short)}</option>`).join('');
 $('role-filter').insertAdjacentHTML('beforeend',Object.entries(A.roles).map(([k,v])=>`<option value="${esc(k)}">${esc(v)}</option>`).join(''));
 $('count-reviewed').textContent=A.papers.length;$('count-pending').textContent=A.pending.length;
 renderTimeline();renderWirelength();renderMatrix();renderGraph();renderRelations();renderComparison();renderLibrary();
}
function renderMatrix(){
 const g=A.matrixGroups.find(g=>g.id===state.matrix);
 $('matrix-body').innerHTML=g.papers.map(id=>{const p=P[id];return `<tr><td class="matrix-paper">${paperButton(id)}<small>${esc(p.year||'当前文档')} · ${esc(A.roles[p.role])}<br>${esc(accessNames[p.access])}</small></td>${A.axes.map(a=>`<td>${esc(p.components[a.id]||'—')}</td>`).join('')}</tr>`;}).join('');
 document.querySelectorAll('[data-matrix]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.matrix===state.matrix)));
}
function wrapLabel(t,max=25){let lines=[''];for(const c of String(t)){const i=lines.length-1;if(lines[i].length>=max)lines.push(c);else lines[i]+=c;}return lines;}
function nodeSVG(id,x,y,w,focus=false){const p=P[id],lines=wrapLabel(p.short,26);return `<g class="graph-node${focus?' focus':''}" data-open="${esc(id)}" role="button" tabindex="0" aria-label="查看 ${esc(p.short)}"><title>${esc(p.title)}</title><rect x="${x}" y="${y}" width="${w}" height="66" rx="4"/><text x="${x+15}" y="${y+24}" font-size="12" font-weight="600">${lines.slice(0,2).map((s,i)=>`<tspan x="${x+15}" dy="${i?15:0}">${esc(s)}</tspan>`).join('')}</text><text x="${x+15}" y="${y+53}" font-size="10" class="node-sub">${esc(p.year||'实现文档')} · ${esc(A.roles[p.role])}</text></g>`;}
function renderGraph(){
 const focus=state.graph;
 const edges=A.relations.filter(r=>(r.type==='adopts'||r.type==='extends')&&(r.to===focus||r.from===focus));
 const incoming=edges.filter(r=>r.to===focus),outgoing=edges.filter(r=>r.from===focus);
 const other=A.relations.filter(r=>r.to===focus||r.from===focus).length-edges.length;
 $('graph-explanation').textContent=`${edges.length} 条采用 / 扩展关系；${other} 条比较或引用见下方证据。`;
 if(!edges.length){$('graph-frame').innerHTML='<div class="empty">本次未核实该文献的采用或扩展关系。<br>可在下方查看已记录的比较或引用。</div>';return;}
 const both=incoming.length&&outgoing.length;const W=both?1200:960;const box=both?230:260;const H=Math.max(265,Math.max(incoming.length,outgoing.length)*92+85);
 const cy=(H-66)/2;const cx=both?485:(incoming.length?655:45);const leftX=both?30:45;const rightX=both?940:655;
 let svg=`<svg viewBox="0 0 ${W} ${H}" aria-labelledby="graph-title graph-desc" role="img"><title id="graph-title">${esc(P[focus].short)} 的方法关系</title><desc id="graph-desc">箭头从被采用的方法或早期版本指向使用或扩展它的工作。图中没有作者关联或实验比较箭头。</desc><defs><marker id="arrow-adopts" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 Z" fill="#1e5d56"/></marker><marker id="arrow-extends" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 Z" fill="#335d80"/></marker></defs>`;
 if(incoming.length)svg+=`<text x="${leftX}" y="27" class="graph-heading">采用的组件 / 明确的前版</text>`;
 svg+=`<text x="${cx}" y="27" class="graph-heading">${incoming.length?'聚焦文献':'组件来源 / 前版'}</text>`;
 if(outgoing.length)svg+=`<text x="${rightX}" y="27" class="graph-heading">采用该方法 / 后续扩展</text>`;
 const nodes=[];
 incoming.forEach((r,i)=>{const y=(H-incoming.length*92)/2+i*92;const x1=leftX+box,x2=cx,mid=(x1+x2)/2;const y1=y+33,y2=cy+33;svg+=`<path class="graph-line" stroke="${r.type==='extends'?'#335d80':'#1e5d56'}" d="M${x1},${y1} C${mid},${y1} ${mid},${y2} ${x2-4},${y2}" marker-end="url(#arrow-${r.type})"/><text x="${x1+14}" y="${y1-9}" class="graph-label">${esc(r.component.length>22?r.component.slice(0,21)+'…':r.component)}</text>`;nodes.push(nodeSVG(r.from,leftX,y,box));});
 outgoing.forEach((r,i)=>{const y=(H-outgoing.length*92)/2+i*92;const x1=cx+box,x2=rightX,mid=(x1+x2)/2;const y1=cy+33,y2=y+33;svg+=`<path class="graph-line" stroke="${r.type==='extends'?'#335d80':'#1e5d56'}" d="M${x1},${y1} C${mid},${y1} ${mid},${y2} ${x2-4},${y2}" marker-end="url(#arrow-${r.type})"/><text x="${x2-14}" y="${y2-9}" text-anchor="end" class="graph-label">${esc(r.component.length>22?r.component.slice(0,21)+'…':r.component)}</text>`;nodes.push(nodeSVG(r.to,rightX,y,box));});
 svg+=nodes.join('')+nodeSVG(focus,cx,cy,box,true)+'</svg>';$('graph-frame').innerHTML=svg;
}
function renderRelations(){
 const scope=$('relation-scope').value,type=$('relation-type').value;
 const rels=A.relations.filter(r=>(scope==='all'||r.from===state.graph||r.to===state.graph)&&(type==='all'||r.type===type));
 $('relation-list').innerHTML=rels.length?rels.map(r=>`<article class="relation-row"><span class="relation-type ${esc(r.type)}">${esc(typeNames[r.type])}</span><div class="relation-endpoints">${paperButton(r.from)}<span class="quiet" aria-label="${r.type==='compares'?'与':'至'}">${r.type==='compares'?'与':'→'}</span>${paperButton(r.to)}</div><div class="relation-detail"><p>${esc(r.claim)}</p>${ext(r.url,r.locator,'relation-locator')}${r.note?`<span class="relation-limit">${esc(r.note)}</span>`:''}</div></article>`).join(''):'<div class="empty">当前范围没有这类已核实关系。</div>';
}
function stepHTML(s,i){return `<div class="pipeline-step"><span class="step-no">${i+1}</span><div><h5>${esc(s.stage)}</h5><p><strong>变量：</strong>${esc(s.variable)}</p><p><strong>方法：</strong>${esc(s.method)}</p><p><strong>输出：</strong>${esc(s.output)}</p><span class="source-locator">${esc(s.locator)}</span></div></div>`;}
function renderComparison(){
 const c=A.comparison,t=c.industrialTable;
 $('pair-body').innerHTML=c.rows.map(r=>`<tr><td>${esc(r.aspect)}</td><td>${esc(r.tvlsi)}<span class="source-locator">${esc(r.locators[0])}</span></td><td>${esc(r.date)}<span class="source-locator">${esc(r.locators[1])}</span></td></tr>`).join('');
 $('qp-note').innerHTML=`<h3>GP, QP and LP</h3><p>${esc(c.qpExplanation)}</p><p>${esc(c.qpSubprocessNote)}</p><span class="source-locator">DATE 2025 §II-A–C；§III-E；§IV-B；Algorithm 1</span>`;
 $('pipeline-columns').innerHTML=c.pipelines.map(p=>`<div class="pipeline-column"><h4>${esc(p.label)}</h4>${p.steps.map((s,i)=>(p.id==='MCTS25'&&i===3?'<div class="technical-note" style="margin:0 0 16px;padding:10px 13px"><p>以下四步为完整分配的评估子流程，训练 episode 和 MCTS 终局均会调用。</p></div>':'')+stepHTML(s,i)).join('')}</div>`).join('');
 $('experiment-head').innerHTML='<tr><th scope="col">工业案例</th><th scope="col">SE baseline [26]</th><th scope="col">DREAMPlace [25]</th><th scope="col">DATE 2025</th></tr>';
 $('experiment-body').innerHTML=t.rows.map(row=>`<tr><td>${esc(row[0])}</td>${row.slice(1).map(n=>`<td>${Number(n).toFixed(2)}</td>`).join('')}</tr>`).join('')+'<tr><td>Nor.（原表）</td><td>1.05</td><td>1.23</td><td>1.00</td></tr>';
 const dif=t.benchmarkDifferences.map(d=>`${d.case} ${d.field}：${d.tvlsi2021} / ${d.date2025}`).join('；');
 const notes=[['单位与汇总',`${t.units}。${t.normalizationNote}`],['基线配置',t.baselineVariantNote],['输入统计',`${dif}（前者 TVLSI 2021，后者 DATE 2025）。${t.benchmarkDifferenceNote}`],['结果范围',`${t.interpretation} 工业表未提供 overflow、DRC 或时序结果。${t.excludedCases}`]];
 $('experiment-notes').innerHTML=notes.map(([title,text],i)=>`<div class="experiment-note"><span>${String(i+1).padStart(2,'0')}</span><div><strong>${esc(title)}。</strong>${esc(text)}</div></div>`).join('');
 $('comparison-sources').innerHTML=c.sources.map(s=>ext(s.url,s.label)).join('')+`<span>${esc(t.locator)}；TVLSI 2021 Tables I–III</span>`;
}
function filteredPapers(){
 let list=state.mode==='reviewed'?A.papers:A.pending;
 const q=state.query.trim().toLocaleLowerCase();
 if(q)list=list.filter(p=>[p.title,p.short,p.authors,p.doi,p.venue,p.scope,p.method,...Object.values(p.components||{})].filter(Boolean).join(' ').toLocaleLowerCase().includes(q));
 if(state.mode==='reviewed')list=list.filter(p=>(state.role==='all'||p.role===state.role)&&(state.access==='all'||p.access===state.access));
 return list.slice().sort((a,b)=>{const av=a.year||9999,bv=b.year||9999;return (state.sort==='asc'?av-bv:bv-av)||a.title.localeCompare(b.title);});
}
function renderLibrary(){
 const list=filteredPapers();const pages=Math.max(1,Math.ceil(list.length/pageSize));state.page=Math.min(state.page,pages);
 const lo=(state.page-1)*pageSize,rows=list.slice(lo,lo+pageSize);
 $('library-result').textContent=`${state.mode==='reviewed'?'本次核查':'待核查索引'} · ${list.length} 条${list.length?' · 当前 '+(lo+1)+'–'+Math.min(lo+pageSize,list.length):''}`;
 $('pending-note').hidden=state.mode!=='pending';$('role-filter').disabled=state.mode==='pending';$('access-filter').disabled=state.mode==='pending';
 $('paper-list').innerHTML=rows.length?rows.map(p=>`<article class="paper-row"><div class="paper-year">${esc(p.year||'文档')}<span>${esc(p.id)}</span></div><div><button class="paper-title" data-open="${esc(p.id)}">${esc(p.title)}</button><div class="paper-byline">${esc(p.venue)}</div>${state.mode==='reviewed'?`<p class="paper-method">${esc(p.method)}</p><div class="paper-flags">${badge(p)}<span class="badge role">${esc(A.roles[p.role])}</span></div>`:`<div class="paper-byline">${esc(p.authors)}</div><div class="paper-flags">${badge(p)}<span class="badge role">${esc(p.type||'文献线索')}</span></div>`}</div><div class="paper-actions"><button class="button" data-open="${esc(p.id)}">${state.mode==='reviewed'?'查看证据':'查看线索'} <span aria-hidden="true">↗</span></button>${ext(p.doi?'https://doi.org/'+p.doi:p.url,p.doi?'DOI':'来源','source-short')}${readButton(p.id)}</div></article>`).join(''):'<div class="empty">没有匹配记录。可修改关键词或重置筛选。</div>';
 $('page-info').textContent=`${state.page} / ${pages}`;$('page-prev').disabled=state.page===1;$('page-next').disabled=state.page===pages;
}
function switchLibrary(mode){state.mode=mode;state.page=1;document.querySelectorAll('[data-library]').forEach(b=>{const active=b.dataset.library===mode;b.setAttribute('aria-selected',active);b.tabIndex=active?0:-1;});$('library-panel').setAttribute('aria-labelledby','tab-'+mode);renderLibrary();}
function dialogHTML(p){
 const pending=p.access==='pending';
 let html=`<h2 class="dialog-title" id="dialog-title">${esc(p.title)}</h2><p class="dialog-authors">${esc(p.authors)}</p><p class="dialog-biblio">${esc(p.venue)}${p.doi?' · DOI: '+esc(p.doi):''}</p><div class="paper-flags">${badge(p)}${p.role?`<span class="badge role">${esc(A.roles[p.role])}</span>`:''}</div><div class="dialog-links">${ext(p.url,pending?'原索引来源':'原文 / 官方来源','button')}${p.doi?ext('https://doi.org/'+p.doi,'DOI','button'):''}${!pending?`<button class="button" data-focus="${esc(p.id)}">查看关系</button>`:''}${readButton(p.id)}</div>`;
 if(pending)return html+'<section class="dialog-section"><h3>待核查记录</h3><p>本条保留旧版的题名、作者、年份和来源线索，尚未完成本次重新核查。原有的方法说明、分类与谱系结论不继续展示。</p><p>此处的发表状态和题录仍应以原始出版来源复核。</p></section>';
 if(p.version)html+=`<p class="dialog-biblio">${esc(p.version)}</p>`;
 if(p.publicationStatus){const s=p.publicationStatus;html+=`<div class="publication-status"><strong>后续出版状态：</strong>${esc(s.venue)}，${esc(s.year)}，${esc(s.status)}。${ext('https://doi.org/'+s.doi,s.doi)}<br>${esc(s.note)}</div>`;}
 html+=`<section class="dialog-section"><h3>研究对象</h3><p>${esc(p.scope)}</p></section><section class="dialog-section"><h3>方法要点</h3><p>${esc(p.method)}</p></section><section class="dialog-section"><h3>方法构成</h3><dl class="component-list">${A.axes.map(a=>`<dt>${esc(a.label)}</dt><dd>${esc(p.components[a.id]||'—')}</dd>`).join('')}${Object.entries(p.extraComponents||{}).map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl></section>`;
 if(p.limits?.length)html+=`<section class="dialog-section"><h3>适用范围与证据边界</h3><ul>${p.limits.map(l=>`<li>${esc(l)}</li>`).join('')}</ul></section>`;
 if(p.bibliographicNote)html+=`<section class="dialog-section"><h3>版本说明</h3><p>${esc(p.bibliographicNote)}</p></section>`;
 html+=`<section class="dialog-section"><h3>证据与原文定位</h3>${p.evidence.map((e,i)=>`<article class="evidence-item"><strong>${i+1}. ${esc(e.locator)}</strong><p>${esc(e.claim)}</p>${ext(e.url,`${accessNames[e.access]||e.access} · 查看来源`)}</article>`).join('')}</section>`;
 if(p.pipeline?.length)html+=`<section class="dialog-section"><details><summary>阶段分解（${p.pipeline.length} 个阶段）</summary><div style="padding-top:18px">${p.id==='MCTS25'?'<p style="margin-bottom:15px">QP-1 至标准单元 placement 是完整分配的评估子流程，在训练与 MCTS 终局中重复调用。</p>':''}${p.pipeline.map(stepHTML).join('')}</div></details></section>`;
 const related=A.relations.filter(r=>r.from===p.id||r.to===p.id);
 if(related.length)html+=`<section class="dialog-section"><h3>已核实的相关文献</h3>${related.map(r=>`<div class="evidence-item"><span class="relation-type ${esc(r.type)}">${esc(typeNames[r.type])}</span> ${paperButton(r.from)} ${r.type==='compares'?'与':'→'} ${paperButton(r.to)}<p>${esc(r.claim)}</p>${r.note?`<p>${esc(r.note)}</p>`:''}${ext(r.url,r.locator)}</div>`).join('')}</section>`;
 html+=`<section class="dialog-section"><h3>引用信息</h3><div class="citation-box">${esc(p.authors)}. ${esc(p.title)}. ${esc(p.venue)}.${p.doi?' DOI: '+esc(p.doi)+'.':''}</div></section>`;
 return html;
}
function openPaper(id){const p=ALL[id];if(!p)return;if(!$('paper-dialog').open)lastFocus=document.activeElement;$('dialog-kicker').textContent=`PUBLICATION RECORD / ${p.id} / ${p.year||'DOCUMENTATION'}`;$('dialog-content').innerHTML=dialogHTML(p);if(!$('paper-dialog').open)$('paper-dialog').showModal();$('paper-dialog').scrollTop=0;$('close-dialog').focus({preventScroll:true});history.replaceState(null,'','#paper-'+encodeURIComponent(id));}
function closePaper(){if($('paper-dialog').open)$('paper-dialog').close();}
$('paper-dialog').addEventListener('close',()=>{if(location.hash.startsWith('#paper-'))history.replaceState(null,'',location.pathname+location.search);if(lastFocus&&lastFocus.isConnected)lastFocus.focus({preventScroll:true});});
function toast(text){$('toast').textContent=text;$('toast').hidden=false;setTimeout(()=>$('toast').hidden=true,2200);}
function setGraph(id){if(!Array.from($('graph-focus').options).some(o=>o.value===id)){toast('本次尚未核实这篇文献的关系。');return;}state.graph=id;$('graph-focus').value=id;$('relation-scope').value='focus';$('relation-type').value='all';renderGraph();renderRelations();closePaper();$('relations').scrollIntoView({behavior:'smooth'});}
document.addEventListener('click',e=>{const o=e.target.closest('[data-open]');if(o){openPaper(o.dataset.open);return;}const f=e.target.closest('[data-focus]');if(f){setGraph(f.dataset.focus);return;}const m=e.target.closest('[data-matrix]');if(m){state.matrix=m.dataset.matrix;renderMatrix();return;}const tab=e.target.closest('[data-library]');if(tab){switchLibrary(tab.dataset.library);return;}const r=e.target.closest('[data-read]');if(r){const id=r.dataset.read;readState[id]=!readState[id];try{localStorage.setItem('macro-atlas-read-v1',JSON.stringify(readState));}catch(_){toast('浏览器未允许保存阅读标记。');}document.querySelectorAll('[data-read]').forEach(b=>{if(b.dataset.read===id){b.textContent=readState[id]?'✓ 已阅读':'标记已读';b.classList.toggle('is-read',!!readState[id]);b.setAttribute('aria-pressed',String(!!readState[id]));}});}});
document.addEventListener('keydown',e=>{const n=e.target.closest('.graph-node');if(n&&(e.key==='Enter'||e.key===' ')){e.preventDefault();openPaper(n.dataset.open);}const tab=e.target.closest('[data-library]');if(tab&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){e.preventDefault();const mode=state.mode==='reviewed'?'pending':'reviewed';switchLibrary(mode);$('tab-'+mode).focus();}});
$('close-dialog').addEventListener('click',closePaper);
$('paper-dialog').addEventListener('click',e=>{if(e.target===$('paper-dialog')){const r=$('paper-dialog').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closePaper();}});
$('graph-focus').addEventListener('change',e=>{state.graph=e.target.value;renderGraph();renderRelations();});
['relation-scope','relation-type'].forEach(id=>$(id).addEventListener('change',renderRelations));
$('paper-search').addEventListener('input',e=>{state.query=e.target.value;state.page=1;renderLibrary();});
[['role-filter','role'],['access-filter','access'],['year-sort','sort']].forEach(([id,key])=>$(id).addEventListener('change',e=>{state[key]=e.target.value;state.page=1;renderLibrary();}));
$('reset-filters').addEventListener('click',()=>{Object.assign(state,{query:'',role:'all',access:'all',sort:'desc',page:1});$('paper-search').value='';$('role-filter').value='all';$('access-filter').value='all';$('year-sort').value='desc';renderLibrary();});
$('page-prev').addEventListener('click',()=>{state.page--;renderLibrary();$('library').scrollIntoView({behavior:'smooth'});});
$('page-next').addEventListener('click',()=>{state.page++;renderLibrary();$('library').scrollIntoView({behavior:'smooth'});});
$('download-data').addEventListener('click',()=>{const blob=new Blob([JSON.stringify(A,null,2)],{type:'application/json;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='macro-placement-atlas.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
window.addEventListener('hashchange',()=>{if(location.hash.startsWith('#paper-'))openPaper(decodeURIComponent(location.hash.slice(7)));});
initial();
if(location.hash.startsWith('#paper-'))openPaper(decodeURIComponent(location.hash.slice(7)));
