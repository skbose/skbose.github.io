(function(){
var q=[],sent={},page=(location.pathname.replace(/\/$/,'').split('/').pop())||'home';
function raw(n){var g=window.goatcounter;if(g&&g.count){g.count({path:page+'/'+n,title:page+'/'+n,event:true});return true}return false}
var tm=0;
function sched(){if(!tm)tm=setTimeout(function(){tm=0;flush()},500)}
function send(n){if(!raw(n)){q.push(n);sched()}}
function flush(){if(!q.length)return;if(window.goatcounter&&window.goatcounter.count){while(q.length)raw(q.shift())}else sched()}

function once(n){if(sent[n])return;sent[n]=1;send(n)}
function slug(t){return (t||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}
document.addEventListener('DOMContentLoaded',function(){
document.querySelectorAll('.ix[data-w]').forEach(function(w){var n=w.dataset.w;
if('IntersectionObserver' in window){var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){once('widget/'+n+'/seen');io.disconnect()}})},{threshold:.5});io.observe(w)}
w.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('button');if(!b)return;
once('widget/'+n+'/used');var opt=b.classList.contains('opt');send('widget/'+n+'/click/'+(opt?'answer':slug(b.textContent)));
if(opt)setTimeout(function(){send('widget/quiz/'+(b.classList.contains('wrong')?'answer-wrong':'answer-right'))},0);
if(n=='rocket'&&b.classList.contains('go')&&w.querySelector('.fx').checked)send('widget/rocket/launch-with-fix')},true);
function ctl(e){var t=e.target;if(!t.matches||!t.matches('input,select'))return;once('widget/'+n+'/used');once('widget/'+n+'/control/'+slug(t.className||t.type))}
w.addEventListener('input',ctl,true);w.addEventListener('change',ctl,true);
if(n=='rocket'&&window.MutationObserver){w.querySelectorAll('.stt').forEach(function(s){new MutationObserver(function(){if(s.classList.contains('bad'))send('widget/rocket/outcome-crash');else if(s.classList.contains('ok'))send('widget/rocket/outcome-liftoff')}).observe(s,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:['class']})})}
});
var pc=document.querySelector('.post-content');
if(pc&&document.querySelector('.post-single')){var marks=[25,50,75,100];
function sc(){var r=pc.getBoundingClientRect(),h=r.height,seen=Math.min(Math.max(window.innerHeight-r.top,0),h)/h*100;marks.forEach(function(m){if(seen>=m-1)once('scroll/'+m)})}
window.addEventListener('scroll',sc,{passive:true});sc()}
document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href^="http"]');if(a&&a.hostname!==location.hostname)send('outbound/'+a.hostname)},true);
});
})();
