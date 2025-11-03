function $(sel){return document.querySelector(sel)}
const tableBody=$('#participantsTable tbody')
const addRowBtn=$('#addRowBtn')
const clearAllBtn=$('#clearAllBtn')
const drawBtn=$('#drawBtn')
const sendBtn=$('#sendBtn')
const previewArea=$('#previewArea')
const statusEl=$('#status')

function addRow(name='', email=''){
  const tr=document.createElement('tr')
  tr.innerHTML=`
    <td><input class="name" placeholder="Name" value="${name}"></td>
    <td><input class="email" placeholder="Email" value="${email}"></td>
    <td>
      <select class="lock">
        <option value="">— none —</option>
      </select>
    </td>
    <td>
      <select class="exclude" multiple size="3"></select>
    </td>
    <td style="text-align:right"><button class="danger">Remove</button></td>
  `
  tr.querySelector('.danger').addEventListener('click', ()=>{ tr.remove(); refreshAllDropdowns() })
  tr.querySelector('.name').addEventListener('input', refreshAllDropdowns)
  tableBody.appendChild(tr)
  refreshAllDropdowns()
}

addRowBtn.addEventListener('click', ()=>addRow())
clearAllBtn.addEventListener('click', ()=>{ tableBody.innerHTML=''; addRow(); resetPreview() })
document.addEventListener('DOMContentLoaded', ()=> addRow())

function getParticipants(){
  const rows=[...tableBody.querySelectorAll('tr')]
  const people=[]
  for(const r of rows){
    const name=r.querySelector('.name').value.trim()
    const email=r.querySelector('.email').value.trim()
    if(!name && !email) continue
    if(!name || !email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){
      throw new Error('Each participant needs a name and a valid email.')
    }
    people.push({name,email,row:r})
  }
  if(people.length<2) throw new Error('Need at least 2 participants.')
  const names=new Set()
  const emails=new Set()
  for(const p of people){
    if(names.has(p.name)) throw new Error(`Duplicate name: ${p.name}`)
    if(emails.has(p.email)) throw new Error(`Duplicate email: ${p.email}`)
    names.add(p.name); emails.add(p.email)
  }
  return people
}

function refreshAllDropdowns(){
  const names=[...tableBody.querySelectorAll('.name')].map(i=>i.value.trim()).filter(Boolean)
  for(const tr of tableBody.querySelectorAll('tr')){
    const nameInput=tr.querySelector('.name')
    const selfName=nameInput.value.trim()
    const lockSel=tr.querySelector('.lock')
    const exSel=tr.querySelector('.exclude')
    const lockValue=lockSel.value
    const exValues=[...exSel.selectedOptions].map(o=>o.value)

    lockSel.innerHTML=`<option value="">— none —</option>`
    exSel.innerHTML=''

    for(const n of names){
      if(!n) continue
      if(n===selfName) continue
      const opt=document.createElement('option')
      opt.value=n; opt.textContent=n
      lockSel.appendChild(opt)
      const exOpt=document.createElement('option')
      exOpt.value=n; exOpt.textContent=n
      exSel.appendChild(exOpt)
    }

    if(lockValue && names.includes(lockValue) && lockValue!==selfName){
      lockSel.value=lockValue
    }
    for(const v of exValues){
      if(names.includes(v) && v!==selfName){
        [...exSel.options].find(o=>o.value===v)?.setAttribute('selected','selected')
      }
    }
  }
}

function buildConstraints(people){
  const locks=new Map()
  const excludes=new Map()
  for(const p of people){
    const lock=p.row.querySelector('.lock').value
    const exSel=p.row.querySelector('.exclude')
    const ex=[...exSel.selectedOptions].map(o=>o.value)
    if(lock){
      if(lock===p.name) throw new Error(`${p.name} cannot be locked to themselves.`)
      locks.set(p.name, lock)
    }
    excludes.set(p.name, new Set(ex))
  }
  const recvLocked=new Set()
  for(const [g,r] of locks){
    if(recvLocked.has(r)) throw new Error(`Multiple locks target ${r}. Each receiver can only be assigned once.`)
    recvLocked.add(r)
  }
  return {locks, excludes}
}

function findAssignment(people, locks, excludes){
  const names=people.map(p=>p.name)
  const receivers=new Set(names)
  const assignment=new Map()
  for(const [giver,recv] of locks){
    assignment.set(giver, recv)
    receivers.delete(recv)
  }
  const unassigned=names.filter(n=>!assignment.has(n))

  function domain(giver){
    const ex=excludes.get(giver) || new Set()
    const dom=[...receivers].filter(r=>r!==giver && !ex.has(r))
    return shuffle(dom)
  }
  function orderByMRV(arr){
    return arr.map(g=>[g, domain(g).length]).sort((a,b)=>a[1]-b[1]).map(([g])=>g)
  }
  function helper(order){
    if(order.length===0) return true
    const giver=order[0]
    const opts=domain(giver)
    for(const r of opts){
      assignment.set(giver,r)
      receivers.delete(r)
      if(helper(orderByMRV(order.slice(1)))) return true
      assignment.delete(giver); receivers.add(r)
    }
    return false
  }
  function shuffle(a){
    const b=[...a]; for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [b[i],b[j]]=[b[j],b[i]]} return b
  }
  const ordered=orderByMRV(unassigned)
  if(!helper(ordered)) throw new Error('No valid assignment found. Try relaxing some locks/exclusions.')
  return assignment
}

let lastEmails=[]

function resetPreview(){
  previewArea.textContent=''
  lastEmails=[]
  sendBtn.disabled=true
}

drawBtn.addEventListener('click', ()=>{
  try{
    const people=getParticipants()
    const {locks, excludes}=buildConstraints(people)
    const eventName=$('#eventName').value.trim()||'Secret Santa'
    const organizer=$('#organizerName').value.trim()||'Organizer'
    const subject=$('#emailSubject').value.trim()||'Your Secret Santa match!'
    const template=$('#messageTemplate').value.trim()||'Hi {{giver}}, you are Secret Santa for {{receiver}} in {{event}}! — {{organizer}}'

    const assignment=findAssignment(people, locks, excludes)
    const previewLines=[]
    const emails=[]
    for(const giver of people){
      const receiverName=assignment.get(giver.name)
      const body=template
        .replaceAll('{{giver}}', giver.name)
        .replaceAll('{{receiver}}', receiverName)
        .replaceAll('{{event}}', eventName)
        .replaceAll('{{organizer}}', organizer)
      previewLines.push(`To ${giver.name} <${giver.email}>: ${body}`)
      emails.push({ to: giver.email, subject, text: body, html: `<p>${escapeHtml(body).replace(/\n/g,'<br>')}</p>` })
    }
    previewArea.textContent=previewLines.join('\n')
    lastEmails=emails
    sendBtn.disabled=false
    statusEl.textContent='Preview ready. Click "Send Emails" to dispatch.'
  }catch(err){
    statusEl.textContent=err.message||String(err)
    resetPreview()
  }
})

function escapeHtml(s){
  return (s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))
}

sendBtn.addEventListener('click', async ()=>{
  if(!lastEmails.length) return
  const testMode=$('#testMode').checked
  statusEl.textContent='Sending...'
  sendBtn.disabled=true
  try{
    const resp=await fetch('/api/send-email',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ emails:lastEmails, test:testMode })
    })
    const data=await resp.json()
    if(!resp.ok) throw new Error(data?.error||'Failed to send')
    const ok=(data.results||[]).filter(r=>r.status==='fulfilled').length
    const fail=(data.results||[]).length-ok
    statusEl.textContent=testMode?`✅ Test mode: ${ok} emails validated (none sent).`:`✅ Sent ${ok} emails${fail?`, ${fail} failed`:''}.`
  }catch(err){
    statusEl.textContent='❌ '+(err.message||String(err))
  }finally{
    sendBtn.disabled=false
  }
})
