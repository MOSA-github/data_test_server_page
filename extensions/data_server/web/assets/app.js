const api=async(url,opt={})=>{const r=await fetch(url,opt);if(!r.ok)throw await r.json();return r.status===204?{}:r.json()};
async function me(){try{return await api('/api/v1/me')}catch{return null}}
async function logout(){const u=await me();if(u)await api('/api/v1/auth/logout',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':u.csrf_token},body:'{}'});location='/login'}
window.logout=logout;
