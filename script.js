// script.js — simple client-side renderer
const POSTS_JSON = 'posts.json';
const postsEl = document.getElementById('posts');
const searchInput = document.getElementById('search');
const tagFilter = document.getElementById('tag-filter');
const tagListEl = document.getElementById('tag-list');
const singlePostEl = document.getElementById('single-post');
const singleHeader = document.getElementById('single-header');
const singleContent = document.getElementById('single-content');
const yearEl = document.getElementById('year');
yearEl.textContent = new Date().getFullYear();

let posts = [];
let tags = new Set();

async function loadPosts(){
  try{
    const res = await fetch(POSTS_JSON, {cache: "no-store"});
    posts = await res.json();
    // Sort by date desc
    posts.sort((a,b)=> new Date(b.date) - new Date(a.date));
    buildTags();
    renderPosts(posts);
    populateTagFilter();
    renderTagList();
    handleRouting();
  }catch(err){
    console.error('Failed to load posts.json', err);
    postsEl.innerHTML = '<p>Unable to load posts.</p>';
  }
}

function buildTags(){
  tags = new Set();
  posts.forEach(p => (p.tags || []).forEach(t => tags.add(t)));
}

function createCard(post){
  const el = document.createElement('article');
  el.className = 'post-card';
  el.innerHTML = `
    ${post.cover ? `<img src="${post.cover}" alt="${escapeHtml(post.title)} cover" style="width:100%;border-radius:8px;max-height:180px;object-fit:cover;margin-bottom:.6rem">`:''}
    <div class="post-meta">
      <time datetime="${post.date}">${formatDate(post.date)}</time>
      <span>•</span>
      <span>${escapeHtml(post.author || 'Author')}</span>
    </div>
    <h2 class="post-title">${escapeHtml(post.title)}</h2>
    <p class="post-excerpt">${escapeHtml(post.excerpt || '')}</p>
    <div class="card-footer">
      ${(post.tags||[]).map(t=>`<a class="tag" href="#tag=${encodeURIComponent(t)}">${escapeHtml(t)}</a>`).join(' ')}
      <div style="margin-top:.5rem">
        <a href="#/post/${encodeURIComponent(post.id)}" aria-label="Read ${escapeHtml(post.title)}">Read →</a>
      </div>
    </div>
  `;
  return el;
}

function renderPosts(list){
  postsEl.innerHTML = '';
  if(list.length === 0) {
    postsEl.innerHTML = '<p>No posts match your search.</p>';
    return;
  }
  const frag = document.createDocumentFragment();
  list.forEach(p => frag.appendChild(createCard(p)));
  postsEl.appendChild(frag);
}

function populateTagFilter(){
  // add unique tag options
  Array.from(tags).sort().forEach(t=>{
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    tagFilter.appendChild(opt);
  });
}

function renderTagList(){
  tagListEl.innerHTML = '';
  Array.from(tags).sort().forEach(t=>{
    const a = document.createElement('a');
    a.href = `#tag=${encodeURIComponent(t)}`;
    a.className = 'tag';
    a.textContent = t;
    tagListEl.appendChild(a);
  });
}
 

// Search + tag filter
function applyFilters(){
  const q = (searchInput.value || '').trim().toLowerCase();
  const tag = tagFilter.value;
  const filtered = posts.filter(p=>{
    const text = (p.title + ' ' + (p.excerpt||'') + ' ' + (p.content || '') + ' ' + (p.tags||[]).join(' ')).toLowerCase();
    if(q && !text.includes(q)) return false;
    if(tag && !(p.tags||[]).includes(tag)) return false;
    return true;
  });
  renderPosts(filtered);
}

// Simple router using hash
function handleRouting(){
  const hash = location.hash || '#/';
  if(hash.startsWith('#/post/')){
    const id = decodeURIComponent(hash.replace('#/post/',''));
    showSinglePost(id);
  } else if(hash.startsWith('#tag=')){
    const tag = decodeURIComponent(hash.replace('#tag=',''));
    // set filter and show
    tagFilter.value = tag;
    applyFilters();
    // scroll to results
    window.scrollTo({top: document.getElementById('posts').offsetTop - 20, behavior:'smooth'});
  } else {
    // home
    hideSinglePost();
    // if query present in hash (e.g., #/about later)
  }
}

function showSinglePost(id){
  const post = posts.find(p => p.id === id);
  if(!post){
    singleHeader.innerHTML=`<h2>Post not found.</h2>`;
    singleContent.innerHTML = '';
  } else {
    singleHeader.innerHTML = `
      <h1>${escapeHtml(post.title)}</h1>
      <div class="post-meta"><time datetime="${post.date}">${formatDate(post.date)}</time> • ${escapeHtml(post.author || '')}</div>
      ${post.cover ? `<img src="${post.cover}" alt="${escapeHtml(post.title)} cover" style="width:100%;border-radius:8px;margin-top:.6rem;max-height:360px;object-fit:cover">` : ''}
    `;
    // render content (safe-ish: content from posts.json should be trusted)
    singleContent.innerHTML = post.content || '';
  }
  singlePostEl.hidden = false;
  // hide list and sidebar visually (simple approach)
  document.getElementById('posts').style.display = 'none';
  document.getElementById('sidebar').style.display = 'none';
  window.scrollTo({top:0,behavior:'smooth'});
}

function hideSinglePost(){
  singlePostEl.hidden = true;
  document.getElementById('posts').style.display = '';
  document.getElementById('sidebar').style.display = '';
}

// Small helpers
function formatDate(iso){
  try{
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {year: 'numeric', month:'short', day:'numeric'});
  }catch(e){ return iso }
}
function escapeHtml(unsafe){
  return String(unsafe || '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
}

// Events
searchInput.addEventListener('input', debounce(applyFilters, 220));
tagFilter.addEventListener('change', applyFilters);
window.addEventListener('hashchange', handleRouting);
document.getElementById('menu-toggle').addEventListener('click', e=>{
  const btn = e.currentTarget;
  const list = document.getElementById('nav-list');
  const open = btn.getAttribute('aria-expanded') === 'true';
  btn.setAttribute('aria-expanded', String(!open));
  list.style.display = open ? '' : 'block';
});

// simple debounce
function debounce(fn, wait){ let t; return (...args)=>{ clearTimeout(t); t = setTimeout(()=>fn(...args), wait); }}

// init
loadPosts();
