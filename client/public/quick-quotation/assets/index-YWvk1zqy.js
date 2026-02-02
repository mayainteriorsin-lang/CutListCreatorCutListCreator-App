(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))o(a);new MutationObserver(a=>{for(const s of a)if(s.type==="childList")for(const r of s.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&o(r)}).observe(document,{childList:!0,subtree:!0});function e(a){const s={};return a.integrity&&(s.integrity=a.integrity),a.referrerPolicy&&(s.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?s.credentials="include":a.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function o(a){if(a.ep)return;a.ep=!0;const s=e(a);fetch(a.href,s)}})();class K{constructor(){this.state={client:{name:"",address:"",contact:"",email:""},quotation:{date:"",number:"MI-2024-001",mainItems:[],additionalItems:[],mainTotal:0,additionalTotal:0},settings:{gstEnabled:!1,gstRate:18,discountType:"amount",discountValue:0,bankAccounts:[{name:"HDFC - Maya Interiors",bank:"HDFC",accNo:"1234567890",ifsc:"HDFC0001234",upi:"mayainteriors@upi"}],selectedBank:0,paidAmount:0,phone:"9840808883",email:"info@mayainteriors.com",location:"Chennai"},shortcuts:{floors:{gf:"GROUND FLOOR",ff:"FIRST FLOOR",sf:"SECOND FLOOR",tf:"THIRD FLOOR",rf:"ROOF FLOOR",bf:"BASEMENT"},rooms:{lr:"LIVING ROOM",br:"BEDROOM",mb:"MASTER BEDROOM",kt:"KITCHEN",ba:"BATHROOM",dr:"DINING ROOM",po:"POOJA ROOM",st:"STUDY ROOM",bl:"BALCONY",ha:"HALL",ut:"UTILITY",sk:"STORE"},items:{tv:{name:"TV Unit",rate:8e4},ws:{name:"Wardrobe Shutter",rate:1600},kb:{name:"Kitchen bottom shutter",rate:850},ls:{name:"Loft shutter",rate:750},pu:{name:"Pooja Unit",rate:1400},cu:{name:"Crockery Unit",rate:1400},fc:{name:"False Ceiling",rate:120},pt:{name:"Painting",rate:22},ep:{name:"Electrical Point",rate:450}}},ui:{activePanel:null,activeModal:null,additionalSectionVisible:!1},savedClients:{},history:{past:[],future:[]}},this.subscribers=new Map,this.maxHistory=50}get(t){if(!t)return this.state;const e=t.split(".");let o=this.state;for(const a of e){if(o==null)return;o=o[a]}return o}set(t,e,o=!0){const a=t.split("."),s=a.pop();let r=this.state;for(const d of a)d in r||(r[d]={}),r=r[d];const l=r[s];r[s]=e,this.notify(t,e,l),o&&t!=="history"&&this.saveHistory()}update(t,e){const o=this.get(t)||{};this.set(t,{...o,...e})}subscribe(t,e){return this.subscribers.has(t)||this.subscribers.set(t,new Set),this.subscribers.get(t).add(e),()=>{this.subscribers.get(t).delete(e)}}notify(t,e,o){this.subscribers.has(t)&&this.subscribers.get(t).forEach(s=>s(e,o,t));const a=t.split(".");for(let s=a.length-1;s>0;s--){const r=a.slice(0,s).join(".");this.subscribers.has(r)&&this.subscribers.get(r).forEach(l=>l(this.get(r),null,t))}this.subscribers.has("*")&&this.subscribers.get("*").forEach(s=>s(e,o,t))}saveHistory(){const t=JSON.stringify({client:this.state.client,quotation:this.state.quotation,settings:this.state.settings}),e=this.state.history;e.past.push(t),e.past.length>this.maxHistory&&e.past.shift(),e.future=[]}undo(){const t=this.state.history;if(t.past.length<2)return!1;const e=t.past.pop();t.future.push(e);const o=t.past[t.past.length-1],a=JSON.parse(o);return this.set("client",a.client,!1),this.set("quotation",a.quotation,!1),this.set("settings",a.settings,!1),!0}redo(){const t=this.state.history;if(t.future.length===0)return!1;const e=t.future.pop();t.past.push(e);const o=JSON.parse(e);return this.set("client",o.client,!1),this.set("quotation",o.quotation,!1),this.set("settings",o.settings,!1),!0}reset(){this.state.client={name:"",address:"",contact:"",email:""},this.state.quotation={date:new Date().toISOString().split("T")[0],number:"MI-2024-001",mainItems:[],additionalItems:[],mainTotal:0,additionalTotal:0},this.state.settings.discountValue=0,this.state.settings.paidAmount=0,this.state.history={past:[],future:[]},this.notify("*",null,null)}getState(){return{client:this.state.client,quotation:this.state.quotation,settings:this.state.settings,shortcuts:this.state.shortcuts,savedClients:this.state.savedClients}}loadState(t){t.client&&this.set("client",t.client,!1),t.quotation&&this.set("quotation",t.quotation,!1),t.settings&&this.set("settings",{...this.state.settings,...t.settings},!1),t.shortcuts&&this.set("shortcuts",{...this.state.shortcuts,...t.shortcuts},!1),t.savedClients&&this.set("savedClients",t.savedClients,!1),this.saveHistory()}}const n=new K,f={QUOTATION:"mayaQuotation",CLIENTS:"mayaClients",SHORTCUTS_FLOORS:"floorShortcuts",SHORTCUTS_ROOMS:"roomShortcuts",SHORTCUTS_ITEMS:"itemShortcuts"},w={saveAll(){try{const i=n.getState(),t={quoteDate:i.quotation.date,quoteNumber:i.quotation.number,clientName:i.client.name,clientAddress:i.client.address,clientContact:i.client.contact,clientEmail:i.client.email,mainItems:i.quotation.mainItems,additionalItems:i.quotation.additionalItems,gstEnabled:i.settings.gstEnabled,gstRate:i.settings.gstRate,discountType:i.settings.discountType,discountValue:i.settings.discountValue,bankAccounts:i.settings.bankAccounts,paidAmount:i.settings.paidAmount};return localStorage.setItem(f.QUOTATION,JSON.stringify(t)),localStorage.setItem(f.SHORTCUTS_FLOORS,JSON.stringify(i.shortcuts.floors)),localStorage.setItem(f.SHORTCUTS_ROOMS,JSON.stringify(i.shortcuts.rooms)),localStorage.setItem(f.SHORTCUTS_ITEMS,JSON.stringify(i.shortcuts.items)),!0}catch(i){return console.error("StorageService.saveAll error:",i),!1}},loadAll(){try{const i=localStorage.getItem(f.QUOTATION);if(i){const s=JSON.parse(i);n.update("client",{name:s.clientName||"",address:s.clientAddress||"",contact:s.clientContact||"",email:s.clientEmail||""}),n.update("quotation",{date:s.quoteDate||"",number:s.quoteNumber||"MI-2024-001",mainItems:s.mainItems||[],additionalItems:s.additionalItems||[]}),n.update("settings",{gstEnabled:s.gstEnabled||!1,gstRate:s.gstRate||18,discountType:s.discountType||"amount",discountValue:s.discountValue||0,bankAccounts:s.bankAccounts||n.get("settings.bankAccounts"),paidAmount:s.paidAmount||0})}const t=localStorage.getItem(f.SHORTCUTS_FLOORS);t&&n.set("shortcuts.floors",JSON.parse(t),!1);const e=localStorage.getItem(f.SHORTCUTS_ROOMS);e&&n.set("shortcuts.rooms",JSON.parse(e),!1);const o=localStorage.getItem(f.SHORTCUTS_ITEMS);o&&n.set("shortcuts.items",JSON.parse(o),!1);const a=localStorage.getItem(f.CLIENTS);return a&&n.set("savedClients",JSON.parse(a),!1),!0}catch(i){return console.error("StorageService.loadAll error:",i),!1}},getClients(){try{const i=localStorage.getItem(f.CLIENTS);return i?JSON.parse(i):{}}catch(i){return console.error("StorageService.getClients error:",i),{}}},saveToClients(i){try{const t=n.getState(),e={...t.savedClients};return e[i]={quoteDate:t.quotation.date,clientName:t.client.name,clientAddress:t.client.address,clientContact:t.client.contact,clientEmail:t.client.email,mainItems:t.quotation.mainItems,additionalItems:t.quotation.additionalItems,mainTotal:t.quotation.mainTotal,additionalTotal:t.quotation.additionalTotal,grandTotal:this.calculateGrandTotal(t),gstEnabled:t.settings.gstEnabled,gstRate:t.settings.gstRate,discountType:t.settings.discountType,discountValue:t.settings.discountValue,paidAmount:t.settings.paidAmount,savedAt:new Date().toISOString()},localStorage.setItem(f.CLIENTS,JSON.stringify(e)),n.set("savedClients",e,!1),!0}catch(t){return console.error("StorageService.saveToClients error:",t),!1}},loadClient(i){try{const e=n.get("savedClients")[i];return e?(n.update("client",{name:e.clientName||"",address:e.clientAddress||"",contact:e.clientContact||"",email:e.clientEmail||""}),n.update("quotation",{date:e.quoteDate||"",number:i,mainItems:e.mainItems||[],additionalItems:e.additionalItems||[],mainTotal:e.mainTotal||0,additionalTotal:e.additionalTotal||0}),n.update("settings",{gstEnabled:e.gstEnabled||!1,gstRate:e.gstRate||18,discountType:e.discountType||"amount",discountValue:e.discountValue||0,paidAmount:e.paidAmount||0}),!0):!1}catch(t){return console.error("StorageService.loadClient error:",t),!1}},deleteClient(i){try{const t={...n.get("savedClients")};return delete t[i],localStorage.setItem(f.CLIENTS,JSON.stringify(t)),n.set("savedClients",t,!1),!0}catch(t){return console.error("StorageService.deleteClient error:",t),!1}},calculateGrandTotal(i){const t=(i.quotation.mainTotal||0)+(i.quotation.additionalTotal||0);let e=0;i.settings.discountType==="percent"?e=t*i.settings.discountValue/100:e=i.settings.discountValue||0;const o=t-e;let a=0;i.settings.gstEnabled&&(a=o*i.settings.gstRate/100);const s=o+a;return"₹"+Math.round(s).toLocaleString("en-IN")},clearAll(){Object.values(f).forEach(i=>{localStorage.removeItem(i)}),n.reset()},exportData(){return JSON.stringify(n.getState(),null,2)},importData(i){try{const t=JSON.parse(i);return n.loadState(t),this.saveAll(),!0}catch(t){return console.error("StorageService.importData error:",t),!1}}};function c(i){return i==null||isNaN(i)?"0":Math.round(i).toLocaleString("en-IN")}function J(i){if(!i)return"";const t=new Date(i);if(isNaN(t.getTime()))return"";const e=["January","February","March","April","May","June","July","August","September","October","November","December"];return`${t.getDate()} ${e[t.getMonth()]} ${t.getFullYear()}`}function P(i=new Date){return i.toISOString().split("T")[0]}function Y(i="MI"){const t=new Date().getFullYear(),e=Math.floor(Math.random()*900)+100;return`${i}-${t}-${e}`}function Q(i){return i?i.trim().replace(/[^a-zA-Z0-9\s]/g,"").replace(/\s+/g,"_"):"Unnamed"}const y={calculateItemRow(i){const t=parseFloat(i.height)||0,e=parseFloat(i.width)||0,o=parseFloat(i.rate)||0,a=parseInt(i.qty)||1,s=parseFloat(i.amount)||0;let r=0,l=0,d=0;return t>0&&e>0?(r=t*e,l=r*o,d=l*a):s>0?(l=s,d=s*a):o>0&&(l=o,d=o*a),{sqft:r?r.toFixed(2):"",amount:l?Math.round(l):"",total:d?Math.round(d):""}},calculateSectionTotal(i){let t=0;return i.forEach(e=>{e.type==="item"&&(t+=parseFloat(e.total)||0)}),t},calculateFloorTotals(i){const t=[...i];let e=-1,o=0;for(let a=0;a<t.length;a++){const s=t[a];s.type==="floor"?(e>=0&&(t[e].total=o),e=a,o=0):s.type==="item"&&(o+=parseFloat(s.total)||0)}return e>=0&&(t[e].total=o),t},calculateRoomTotals(i){const t=[...i];let e=-1,o=0;for(let a=0;a<t.length;a++){const s=t[a];s.type==="room"?(e>=0&&(t[e].total=o),e=a,o=0):s.type==="floor"?(e>=0&&(t[e].total=o),e=-1,o=0):s.type==="item"&&(o+=parseFloat(s.total)||0)}return e>=0&&(t[e].total=o),t},calculateSubtotal(){const i=n.get("quotation.mainTotal")||0,t=n.get("quotation.additionalTotal")||0;return i+t},calculateDiscount(i){const t=n.get("settings.discountType"),e=parseFloat(n.get("settings.discountValue"))||0;return t==="percent"?i*e/100:e},calculateGST(i){if(!n.get("settings.gstEnabled"))return 0;const t=parseFloat(n.get("settings.gstRate"))||18;return i*t/100},calculateGrandTotal(){const i=this.calculateSubtotal(),t=this.calculateDiscount(i),e=i-t,o=this.calculateGST(e),a=e+o;return{subtotal:i,discount:t,afterDiscount:e,gst:o,grandTotal:a}},calculatePaymentStages(i){return{booking:Math.round(i*.05),production:Math.round(i*.45),factory:Math.round(i*.45),handover:Math.round(i*.05)}},calculateBalance(i,t=0){return i-t},recalculateAll(){let i=n.get("quotation.mainItems")||[],t=n.get("quotation.additionalItems")||[];i=this.calculateFloorTotals(i),i=this.calculateRoomTotals(i),t=this.calculateFloorTotals(t),t=this.calculateRoomTotals(t);const e=this.calculateSectionTotal(i),o=this.calculateSectionTotal(t);return n.set("quotation.mainItems",i,!1),n.set("quotation.additionalItems",t,!1),n.set("quotation.mainTotal",e,!1),n.set("quotation.additionalTotal",o,!1),this.calculateGrandTotal()},formatTotals(i){return{subtotal:c(i.subtotal),discount:c(i.discount),gst:c(i.gst),grandTotal:c(i.grandTotal),stages:{booking:c(i.grandTotal*.05),production:c(i.grandTotal*.45),factory:c(i.grandTotal*.45),handover:c(i.grandTotal*.05)}}}};function k(i,t=document){return t.querySelector(i)}function Z(i,t=document){return t.querySelectorAll(i)}function X(i,t={},e=[]){const o=document.createElement(i);for(const[a,s]of Object.entries(t))if(a==="className")o.className=s;else if(a==="style"&&typeof s=="object")Object.assign(o.style,s);else if(a.startsWith("on")&&typeof s=="function"){const r=a.slice(2).toLowerCase();o.addEventListener(r,s)}else a==="dataset"?Object.assign(o.dataset,s):o.setAttribute(a,s);return Array.isArray(e)?e.forEach(a=>{typeof a=="string"?o.appendChild(document.createTextNode(a)):a instanceof Element&&o.appendChild(a)}):typeof e=="string"&&(o.textContent=e),o}function G(i,t){i.innerHTML=t}function tt(i,t,e,o){i.addEventListener(t,a=>{const s=a.target.closest(e);s&&i.contains(s)&&o.call(s,a,s)})}function et(i,...t){i.classList.add(...t)}function ot(i,...t){i.classList.remove(...t)}function u(i,t=!0,e=2500){let o=k("#toast");o||(o=X("div",{id:"toast",className:"toast"}),document.body.appendChild(o)),o.textContent=i,o.className=`toast ${t?"success":"error"}`,o.offsetHeight,et(o,"show"),setTimeout(()=>{ot(o,"show")},e)}const j={generateFilename(){const i=n.get("client"),t=n.get("quotation.number")||"MI-2024",e=Q(i.name||"Client"),o=Q(i.address||"Site");return`${e}_${o}_${t}.pdf`},buildPDFHTML(){const i=n.get("client"),t=n.get("quotation"),e=n.get("settings"),o=t.date,a=t.number||"MI-2024-001",s=i.name||"-",r=i.address||"-",l=i.contact||"-",d=i.email||"-",p=J(o),h=y.calculateGrandTotal(),g="₹"+c(h.subtotal),b=h.discount,x=e.gstRate||18,A="₹"+c(h.gst),R="₹"+c(h.grandTotal),C=y.calculatePaymentStages(h.grandTotal),I=e.bankAccounts[e.selectedBank||0]||{},D=e.phone||"9840808883",O=e.email||"info@mayainteriors.com",S=e.location||"Chennai";let T="",V=1;const U=t.mainItems||[],E=t.additionalItems||[];for(let $=0;$<U.length;$++){const m=U[$];if(m.type==="floor")T+=`
          <tr style="background:#C4705A">
            <td colspan="8" style="padding:12px 14px;font-weight:700;font-size:15px;color:white;text-transform:uppercase;letter-spacing:1px">
              ${m.name||""}
            </td>
            <td style="padding:12px 14px;text-align:right;font-weight:700;font-size:15px;color:white">
              ₹${c(m.total||0)}
            </td>
          </tr>`;else if(m.type==="room")T+=`
          <tr style="background:white">
            <td colspan="5" style="padding:10px 14px;font-weight:700;font-size:14px;color:#C4705A;letter-spacing:0.5px">
              ${m.name||""}
            </td>
            <td colspan="4" style="padding:10px 14px;text-align:right;font-weight:700;font-size:14px;color:#C4705A">
              ₹<span style="color:#000000">${c(m.total||0)}</span>
            </td>
          </tr>`;else if(m.type==="item"){const v=m.description||"",N=m.height||"-",q=m.width||"-",F=m.sqft||"-",B=m.rate?"₹"+c(m.rate):"-",z=m.amount?"₹"+c(m.amount):"-",L=m.qty||"1",H=m.total?"₹"+c(m.total):"-";T+=`
          <tr style="border-bottom:1px solid #E8DFD4;font-size:13px">
            <td style="padding:10px 8px;text-align:center;color:#5D4E37;font-weight:600">${V++}</td>
            <td style="padding:10px 8px;font-weight:600;color:#3D3227">${v}</td>
            <td style="padding:10px 8px;text-align:center;font-weight:600">${N}</td>
            <td style="padding:10px 8px;text-align:center;font-weight:600">${q}</td>
            <td style="padding:10px 8px;text-align:center;font-weight:600">${F}</td>
            <td style="padding:10px 8px;text-align:center;font-weight:600">${B}</td>
            <td style="padding:10px 8px;text-align:center;font-weight:600">${z}</td>
            <td style="padding:10px 8px;text-align:center;font-weight:600">${L}</td>
            <td style="padding:10px 8px;text-align:right;font-weight:700;color:#C4705A;font-size:14px">${H}</td>
          </tr>`}}if(E.length>0){const $=E.reduce((m,v)=>m+(parseFloat(v.total)||0),0);T+=`
        <tr style="background:#475569">
          <td colspan="8" style="padding:12px 14px;font-weight:700;font-size:15px;color:white;text-transform:uppercase;letter-spacing:1px">
            ADDITIONAL WORK
          </td>
          <td style="padding:12px 14px;text-align:right;font-weight:700;font-size:15px;color:white">
            ₹${c($)}
          </td>
        </tr>`;for(let m=0;m<E.length;m++){const v=E[m];if(v.type==="item"){const N=v.description||"",q=v.height||"-",F=v.width||"-",B=v.sqft||"-",z=v.rate?"₹"+c(v.rate):"-",L=v.amount?"₹"+c(v.amount):"-",H=v.qty||"1",W=v.total?"₹"+c(v.total):"-";T+=`
            <tr style="border-bottom:1px solid #E8DFD4;font-size:13px">
              <td style="padding:10px 8px;text-align:center;color:#5D4E37;font-weight:600">${V++}</td>
              <td style="padding:10px 8px;font-weight:600;color:#3D3227">${N}</td>
              <td style="padding:10px 8px;text-align:center;font-weight:600">${q}</td>
              <td style="padding:10px 8px;text-align:center;font-weight:600">${F}</td>
              <td style="padding:10px 8px;text-align:center;font-weight:600">${B}</td>
              <td style="padding:10px 8px;text-align:center;font-weight:600">${z}</td>
              <td style="padding:10px 8px;text-align:center;font-weight:600">${L}</td>
              <td style="padding:10px 8px;text-align:center;font-weight:600">${H}</td>
              <td style="padding:10px 8px;text-align:right;font-weight:700;color:#C4705A;font-size:14px">${W}</td>
            </tr>`}}}return`
      <div style="color:#3D3227;font-size:12px">
        <!-- Header - Using table layout for html2canvas compatibility -->
        <table style="width:100%;margin-bottom:20px;border-collapse:collapse">
          <tr>
            <td style="vertical-align:middle;width:auto">
              <table style="border-collapse:collapse">
                <tr>
                  <td style="width:50px;height:50px;background:#C4705A;border-radius:8px;text-align:center;vertical-align:middle;color:white;font-size:24px;font-weight:500;font-family:Georgia,serif">M</td>
                  <td style="padding-left:12px;vertical-align:middle">
                    <div style="font-size:20px"><span style="font-weight:600;color:#3D3227">MAYA</span> <span style="font-weight:300;color:#8C7E6F">INTERIORS</span></div>
                    <div style="font-size:9px;color:#C4705A;letter-spacing:2px">CRAFTING BEAUTIFUL SPACES</div>
                  </td>
                </tr>
              </table>
            </td>
            <td style="text-align:right;vertical-align:middle">
              <div style="font-size:16px;font-weight:600">${p}</div>
              <div style="font-size:13px;color:#C4705A;margin-top:4px">Quote No: ${a}</div>
            </td>
          </tr>
        </table>

        <!-- Client Info - Using table layout -->
        <table style="width:100%;margin-bottom:20px;border-collapse:collapse">
          <tr>
            <td style="width:25%;padding-right:10px;vertical-align:top"><div style="font-size:9px;color:#8C7E6F;text-transform:uppercase">Client</div><div style="border-bottom:1px solid #E8DFD4;padding:4px 0">${s}</div></td>
            <td style="width:25%;padding-right:10px;vertical-align:top"><div style="font-size:9px;color:#8C7E6F;text-transform:uppercase">Contact</div><div style="border-bottom:1px solid #E8DFD4;padding:4px 0">${l}</div></td>
            <td style="width:25%;padding-right:10px;vertical-align:top"><div style="font-size:9px;color:#8C7E6F;text-transform:uppercase">Email</div><div style="border-bottom:1px solid #E8DFD4;padding:4px 0">${d}</div></td>
            <td style="width:25%;vertical-align:top"><div style="font-size:9px;color:#8C7E6F;text-transform:uppercase">Address</div><div style="border-bottom:1px solid #E8DFD4;padding:4px 0">${r}</div></td>
          </tr>
        </table>

        <!-- Table -->
        <table style="width:100%;border-collapse:collapse;margin-bottom:15px;font-size:13px">
          <thead>
            <tr style="background:#FDF6EC">
              <th style="padding:10px 8px;text-align:center;font-size:11px;color:#333;font-weight:700;border-bottom:2px solid #333;width:30px">#</th>
              <th style="padding:10px 8px;text-align:left;font-size:11px;color:#333;font-weight:700;border-bottom:2px solid #333">DESCRIPTION</th>
              <th style="padding:10px 8px;text-align:center;font-size:11px;color:#333;font-weight:700;border-bottom:2px solid #333;width:40px">H</th>
              <th style="padding:10px 8px;text-align:center;font-size:11px;color:#333;font-weight:700;border-bottom:2px solid #333;width:40px">W</th>
              <th style="padding:10px 8px;text-align:center;font-size:11px;color:#333;font-weight:700;border-bottom:2px solid #333;width:50px">SQ.FT</th>
              <th style="padding:10px 8px;text-align:center;font-size:11px;color:#333;font-weight:700;border-bottom:2px solid #333;width:60px">RATE</th>
              <th style="padding:10px 8px;text-align:center;font-size:11px;color:#333;font-weight:700;border-bottom:2px solid #333;width:65px">AMOUNT</th>
              <th style="padding:10px 8px;text-align:center;font-size:11px;color:#333;font-weight:700;border-bottom:2px solid #333;width:35px">QTY</th>
              <th style="padding:10px 8px;text-align:right;font-size:11px;color:#333;font-weight:700;border-bottom:2px solid #333;width:70px">TOTAL</th>
            </tr>
          </thead>
          <tbody>${T}</tbody>
        </table>

        <!-- Summary - Using table layout -->
        <table style="width:100%;margin-bottom:15px;border-collapse:collapse">
          <tr>
            <td style="width:60%"></td>
            <td style="width:40%">
              <table style="width:100%;background:#FDF6EC;border-radius:6px;padding:10px;border-collapse:collapse">
                <tr style="border-bottom:1px solid #E8DFD4">
                  <td style="padding:6px;color:#8C7E6F">Subtotal</td>
                  <td style="padding:6px;text-align:right;font-weight:600">${g}</td>
                </tr>
                <tr style="border-bottom:1px solid #E8DFD4">
                  <td style="padding:6px;color:#8C7E6F">Discount</td>
                  <td style="padding:6px;text-align:right;font-weight:600">-₹${c(b)}</td>
                </tr>
                <tr style="border-bottom:1px solid #E8DFD4">
                  <td style="padding:6px;color:#8C7E6F">GST (${x}%)</td>
                  <td style="padding:6px;text-align:right;font-weight:600">${A}</td>
                </tr>
                <tr style="border-top:2px solid #C4705A">
                  <td style="padding:8px 6px;font-weight:700;color:#C4705A">Grand Total</td>
                  <td style="padding:8px 6px;text-align:right;font-weight:700;color:#C4705A;font-size:14px">${R}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Payment Stages - Using table layout -->
        <table style="width:100%;margin-bottom:15px;border-collapse:collapse">
          <tr>
            <td style="width:70px;font-size:11px;font-weight:600;color:#C4705A;vertical-align:middle">PAYMENT</td>
            <td>
              <table style="width:100%;border-collapse:separate;border-spacing:8px 0">
                <tr>
                  <td style="background:#C4705A;border-radius:6px;padding:10px 8px;text-align:center;width:80px">
                    <table style="width:100%;border-collapse:collapse">
                      <tr><td style="color:white;font-size:16px;font-weight:700;text-align:center">5%</td></tr>
                      <tr><td style="color:white;font-size:8px;text-align:center;padding-top:2px">BOOKING</td></tr>
                      <tr><td style="color:white;font-size:10px;text-align:center;padding-top:2px">₹${c(C.booking)}</td></tr>
                    </table>
                  </td>
                  <td style="color:#C4705A;text-align:center;width:20px;font-size:14px">→</td>
                  <td style="background:#C4705A;border-radius:6px;padding:10px 8px;text-align:center;width:80px">
                    <table style="width:100%;border-collapse:collapse">
                      <tr><td style="color:white;font-size:16px;font-weight:700;text-align:center">45%</td></tr>
                      <tr><td style="color:white;font-size:8px;text-align:center;padding-top:2px">PRODUCTION</td></tr>
                      <tr><td style="color:white;font-size:10px;text-align:center;padding-top:2px">₹${c(C.production)}</td></tr>
                    </table>
                  </td>
                  <td style="color:#C4705A;text-align:center;width:20px;font-size:14px">→</td>
                  <td style="background:#C4705A;border-radius:6px;padding:10px 8px;text-align:center;width:80px">
                    <table style="width:100%;border-collapse:collapse">
                      <tr><td style="color:white;font-size:16px;font-weight:700;text-align:center">45%</td></tr>
                      <tr><td style="color:white;font-size:8px;text-align:center;padding-top:2px">FACTORY</td></tr>
                      <tr><td style="color:white;font-size:10px;text-align:center;padding-top:2px">₹${c(C.factory)}</td></tr>
                    </table>
                  </td>
                  <td style="color:#C4705A;text-align:center;width:20px;font-size:14px">→</td>
                  <td style="background:#C4705A;border-radius:6px;padding:10px 8px;text-align:center;width:80px">
                    <table style="width:100%;border-collapse:collapse">
                      <tr><td style="color:white;font-size:16px;font-weight:700;text-align:center">5%</td></tr>
                      <tr><td style="color:white;font-size:8px;text-align:center;padding-top:2px">HANDOVER</td></tr>
                      <tr><td style="color:white;font-size:10px;text-align:center;padding-top:2px">₹${c(C.handover)}</td></tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Bank & Terms - Using table layout -->
        <table style="width:100%;margin-bottom:15px;border-collapse:collapse">
          <tr>
            <td style="width:50%;padding-right:8px;vertical-align:top">
              <div style="background:#FDF6EC;border-radius:6px;padding:12px">
                <div style="font-size:9px;font-weight:600;color:#8C7E6F;margin-bottom:6px">BANK DETAILS</div>
                <div style="font-size:10px;line-height:1.6">
                  <div>Bank: ${I.bank||"HDFC Bank"}</div>
                  <div>A/C: ${I.accNo||"-"}</div>
                  <div>IFSC: ${I.ifsc||"-"}</div>
                  <div>UPI: ${I.upi||"-"}</div>
                </div>
              </div>
            </td>
            <td style="width:50%;padding-left:8px;vertical-align:top">
              <div style="background:#FDF6EC;border-radius:6px;padding:12px">
                <div style="font-size:9px;font-weight:600;color:#8C7E6F;margin-bottom:6px">TERMS & CONDITIONS</div>
                <div style="font-size:9px;color:#8C7E6F;line-height:1.4">
                  • Rates valid for 30 days<br>
                  • Warranty as per product<br>
                  • Changes may affect price<br>
                  • Site must be ready<br>
                  • No cancellation after production
                </div>
              </div>
            </td>
          </tr>
        </table>

        <!-- Signatures - Using table layout -->
        <table style="width:100%;margin:20px 0;padding-top:15px;border-top:1px solid #E8DFD4;border-collapse:collapse">
          <tr>
            <td style="width:50%;text-align:center">
              <div style="width:120px;border-bottom:1px solid #5D4E37;height:30px;margin:0 auto 5px auto"></div>
              <div style="font-size:9px;color:#8C7E6F">For Maya Interiors</div>
            </td>
            <td style="width:50%;text-align:center">
              <div style="width:120px;border-bottom:1px solid #5D4E37;height:30px;margin:0 auto 5px auto"></div>
              <div style="font-size:9px;color:#8C7E6F">Client Acceptance</div>
            </td>
          </tr>
        </table>

        <!-- Footer -->
        <div style="text-align:center;padding-top:12px;border-top:3px solid #C4705A">
          <div style="font-size:13px;font-weight:600;color:#5D4E37">MAYA INTERIORS</div>
          <div style="font-size:9px;color:#8C7E6F;margin-top:3px">${D} | ${O} | ${S}</div>
          <div style="font-size:9px;color:#8B9A7D;font-style:italic;margin-top:6px">Thank you for choosing Maya Interiors</div>
        </div>
      </div>
    `},async generatePDF(){u("Generating PDF...",!0);const i=document.getElementById("pdfContent");i&&i.remove();const t=document.createElement("div");t.id="pdfContent",t.style.cssText=`
      all: initial;
      position: fixed;
      left: 0;
      top: 0;
      width: 794px;
      height: auto;
      min-height: 1123px;
      padding: 56px;
      background: #ffffff;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 12px;
      line-height: 1.4;
      color: #3D3227;
      box-sizing: border-box;
      z-index: 999999;
      display: block;
      visibility: visible;
      opacity: 1;
    `;try{t.innerHTML=this.buildPDFHTML()}catch(s){console.error("Error building PDF HTML:",s),u("Error generating PDF!",!1);return}document.body.appendChild(t);const e=t.offsetHeight,o=t.offsetWidth;if(console.log("[PDF] Wrapper dimensions:",o,"x",e),console.log("[PDF] Content length:",t.innerHTML.length),!window.html2pdf){console.error("[PDF] html2pdf library not loaded!"),u("PDF library missing!",!1),t.remove();return}console.log("[PDF] html2pdf library found"),await new Promise(s=>setTimeout(s,300)),await new Promise(s=>requestAnimationFrame(s)),await new Promise(s=>setTimeout(s,200));const a=this.generateFilename();console.log("[PDF] Starting capture, filename:",a);try{await window.html2pdf().set({margin:0,filename:a,image:{type:"jpeg",quality:.95},html2canvas:{scale:2,useCORS:!0,allowTaint:!0,backgroundColor:"#ffffff",logging:!0,width:o,height:e,scrollX:0,scrollY:0,x:0,y:0},jsPDF:{unit:"mm",format:"a4",orientation:"portrait"}}).from(t).save(),console.log("[PDF] Generation complete!"),t.remove(),u("PDF downloaded!",!0)}catch(s){console.error("[PDF] Generation error:",s),t.remove(),u("PDF failed: "+s.message,!1)}},print(){const i=this.buildPDFHTML(),t=window.open("","_blank");t.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Maya Interiors - Quotation</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 15mm; background: white; }
          @media print {
            body { padding: 0; }
            @page { margin: 15mm; size: A4; }
          }
        </style>
      </head>
      <body>${i}</body>
      </html>
    `),t.document.close(),setTimeout(()=>{t.print()},500)}},_={validateItem(i,t){if(i.type!=="item")return null;const e=[],o=(i.description||"").trim(),a=parseFloat(i.height)||0,s=parseFloat(i.width)||0,r=parseFloat(i.rate)||0,l=parseFloat(i.amount)||0,d=parseFloat(i.total)||0;o||e.push("No description");const p=a>0&&s>0&&r>0,h=l>0,g=d>0;return!p&&!h&&!g?e.push("Missing values"):(p||h)&&!g&&e.push("Total not calculated"),e.length>0?{rowNum:t,itemId:i.id,description:o||"Unnamed item",problems:e}:null},validateQuotation(){const i=[];let t=0;return(n.get("quotation.mainItems")||[]).forEach(a=>{if(a.type==="item"){t++;const s=this.validateItem(a,t);s&&(s.section="main",i.push(s))}}),(n.get("quotation.additionalItems")||[]).forEach(a=>{if(a.type==="item"){t++;const s=this.validateItem(a,t);s&&(s.section="additional",i.push(s))}}),i},isValid(){return this.validateQuotation().length===0},validateClient(){const i=n.get("client"),t=[];return(!i.name||!i.name.trim())&&t.push("Client name is required"),{valid:t.length===0,issues:t}},isValidEmail(i){return i?/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(i):!0},isValidPhone(i){return i?i.replace(/\D/g,"").length>=10:!0},isValidNumber(i,t={}){const{min:e=-1/0,max:o=1/0,allowZero:a=!0}=t,s=parseFloat(i);return!(isNaN(s)||!a&&s===0||s<e||s>o)},sanitizeString(i){return i?i.trim().replace(/[<>]/g,""):""},sanitizeNumber(i,t=0){const e=parseFloat(i);return isNaN(e)?t:e},getSummaryMessage(i){return i.length===0?"":i.length===1?"1 incomplete item found":`${i.length} incomplete items found`},formatIssues(i){return i.map(t=>({...t,message:`Row ${t.rowNum}: ${t.problems.join(", ")}`}))}};class at{constructor(t,e={}){this.container=typeof t=="string"?k(t):t,this.props=e,this.state={},this.subscriptions=[],this.isRendered=!1,this.render=this.render.bind(this),this.destroy=this.destroy.bind(this)}template(){return""}events(){return{}}afterRender(){}beforeDestroy(){}render(){if(!this.container){console.error("Component container not found");return}const t=this.template();return G(this.container,t),this.isRendered||this.bindEvents(),this.isRendered=!0,this.afterRender(),this}bindEvents(){const t=this.events();for(const[e,o]of Object.entries(t)){const[a,...s]=e.split(" "),r=s.join(" ");r?tt(this.container,a,r,o.bind(this)):this.container.addEventListener(a,o.bind(this))}}subscribe(t,e){const o=n.subscribe(t,e.bind(this));return this.subscriptions.push(o),o}$(t){return k(t,this.container)}$$(t){return Z(t,this.container)}setState(t){this.state={...this.state,...t},this.render()}destroy(){this.beforeDestroy(),this.subscriptions.forEach(t=>t()),this.subscriptions=[],this.container&&(this.container.innerHTML=""),this.isRendered=!1}createChild(t,e,o={}){const a=typeof e=="string"?this.$(e):e;return new t(a,o)}}function it(i){return t=>{const e=[];t.ctrlKey&&e.push("ctrl"),t.shiftKey&&e.push("shift"),t.altKey&&e.push("alt"),e.push(t.key.toLowerCase());const o=e.join("+"),a=i[o];a&&(t.preventDefault(),a(t))}}class st extends at{constructor(t){super(t),this.handleClientInput=this.handleClientInput.bind(this),this.handleQuickEntry=this.handleQuickEntry.bind(this),this.addFloor=this.addFloor.bind(this),this.addRoom=this.addRoom.bind(this),this.addItem=this.addItem.bind(this),this.addAdditionalItem=this.addAdditionalItem.bind(this),this.handleItemInput=this.handleItemInput.bind(this),this.calculateRow=this.calculateRow.bind(this),this.deleteRow=this.deleteRow.bind(this),this.save=this.save.bind(this),this.generatePDF=this.generatePDF.bind(this),this.print=this.print.bind(this),this.newQuote=this.newQuote.bind(this),this.openShortcuts=this.openShortcuts.bind(this),this.openItems=this.openItems.bind(this),this.openClients=this.openClients.bind(this),this.openSettings=this.openSettings.bind(this),this.openReceipt=this.openReceipt.bind(this),this.openStageReceipt=this.openStageReceipt.bind(this),this.shareWhatsApp=this.shareWhatsApp.bind(this),this.handleSettingsInput=this.handleSettingsInput.bind(this),this._isDirty=!1,n.subscribe("*",()=>{this._isDirty=!0}),this.setupKeyboardShortcuts()}setupKeyboardShortcuts(){const t={"ctrl+z":()=>{n.undo()?(this.recalculateAndRender(),u("Undo",!0)):u("Nothing to undo",!1)},"ctrl+y":()=>{n.redo()?(this.recalculateAndRender(),u("Redo",!0)):u("Nothing to redo",!1)},"ctrl+shift+z":()=>{n.redo()&&(this.recalculateAndRender(),u("Redo",!0))},"ctrl+s":()=>{this.save()},"ctrl+p":()=>{this.print()}};document.addEventListener("keydown",it(t))}escapeAttr(t){return(t||"").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}template(){var g,b,x,A,R,C,I,D;const t=n.get("client"),e=n.get("quotation"),o=n.get("settings"),a=n.get("shortcuts"),s=this.escapeAttr,r=y.calculateGrandTotal(),l=y.calculatePaymentStages(r.grandTotal||0),d=Object.entries(a.floors).map(([O,S])=>`<option value="${S}">${S}</option>`).join("")+'<option value="__custom__">Custom...</option>',p=Object.entries(a.rooms).map(([O,S])=>`<option value="${S}">${S}</option>`).join("")+'<option value="__custom__">Custom...</option>',h=this.buildTableRows(e.mainItems||[]);return`
      <div class="app-container">
        <!-- Sidebar -->
        <aside class="sidebar">
          <div class="sidebar-logo">M</div>
          <nav class="sidebar-nav">
            <div class="nav-item active">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              <span class="tooltip">Quotation</span>
            </div>
            <div class="nav-item" data-action="shortcuts">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              <span class="tooltip">Shortcuts</span>
            </div>
            <div class="nav-item" data-action="items">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
              <span class="tooltip">Items</span>
            </div>
            <div class="nav-item" data-action="clients">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
              <span class="tooltip">Clients</span>
            </div>
          </nav>
          <div class="sidebar-spacer"></div>
          <div class="nav-item" data-action="settings">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            <span class="tooltip">Settings</span>
          </div>
        </aside>

        <!-- Main Content -->
        <main class="main-content">
          <!-- Top Bar -->
          <header class="top-bar">
            <div class="top-bar-left">
              <span class="brand-name">Maya <span>Interiors</span></span>
              <div class="doc-badge">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                Quotation
              </div>
            </div>
            <div class="top-bar-right">
              <div class="top-input">
                <label>Date</label>
                <input type="date" id="quoteDate" value="${e.date||P()}">
              </div>
              <div class="top-input">
                <label>Quote #</label>
                <input type="text" id="quoteNumber" value="${s(e.number||"MI-2024-001")}">
              </div>
              <button class="top-btn secondary" data-action="new" style="background:#fef3c7;border-color:#f59e0b;color:#b45309;">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                New
              </button>
              <button class="top-btn secondary" data-action="pdf">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                PDF
              </button>
              <button class="top-btn secondary" data-action="print">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                Print
              </button>
              <button class="top-btn" data-action="save">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg>
                Save
              </button>
              <button class="top-btn secondary" data-action="receipt" style="background:#dcfce7;border-color:#22c55e;color:#166534;">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>
                Receipt
              </button>
            </div>
          </header>

          <!-- Content -->
          <div class="content-area">
            <!-- Client Card -->
            <div class="client-card">
              <div class="client-card-header">
                <div class="client-card-title">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                  Client Information
                </div>
                <div class="client-status">
                  <span class="dot"></span>
                  Draft
                </div>
              </div>
              <div class="client-card-body">
                <div class="client-grid">
                  <div class="form-group">
                    <label>Client Name</label>
                    <input type="text" id="clientName" data-field="client.name" value="${s(t.name)}" placeholder="Enter client name">
                  </div>
                  <div class="form-group">
                    <label>Address</label>
                    <input type="text" id="clientAddress" data-field="client.address" value="${s(t.address)}" placeholder="Enter address">
                  </div>
                  <div class="form-group">
                    <label>Contact Number</label>
                    <input type="tel" id="clientContact" data-field="client.contact" value="${s(t.contact)}" placeholder="Enter phone number">
                  </div>
                  <div class="form-group">
                    <label>Email Address</label>
                    <input type="email" id="clientEmail" data-field="client.email" value="${s(t.email)}" placeholder="Enter email">
                  </div>
                </div>
              </div>
            </div>

            <!-- Main Work Table -->
            <div class="quotation-card" id="mainSection">
              <div class="quotation-header">
                <div class="quotation-title">
                  <h2>Main Work</h2>
                  <span class="badge" id="mainItemCount">${this.getItemCount(e.mainItems)} items</span>
                </div>
                <div class="quotation-total">
                  <span class="label">Section Total</span>
                  <span class="amount">₹<span id="mainTotal">${c(e.mainTotal||0)}</span></span>
                </div>
              </div>
              <div class="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th style="width:50px;">#</th>
                      <th style="min-width:250px;">Description</th>
                      <th class="center" style="width:90px;">Height</th>
                      <th class="center" style="width:90px;">Width</th>
                      <th class="center" style="width:100px;">Sq.ft</th>
                      <th class="center" style="width:110px;">Rate</th>
                      <th class="center" style="width:110px;">Amount</th>
                      <th class="center" style="width:80px;">Qty</th>
                      <th class="center" style="width:120px;">Total</th>
                      <th style="width:70px;"></th>
                    </tr>
                  </thead>
                  <tbody id="mainTableBody">
                    ${h}
                  </tbody>
                </table>
              </div>
              <!-- Quick Actions -->
              <div class="quick-actions" style="margin:0; border-radius:0 0 12px 12px; box-shadow:none; border-top:1px solid var(--gray-100);">
                <div class="quick-search">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                  <input type="text" id="quickInput" placeholder="Type shortcut or search items...">
                  <span class="shortcut-hint">Enter</span>
                </div>
                <div class="action-btns">
                  <select class="action-btn floor" id="floorSelect" style="cursor:pointer;padding-right:30px;">
                    <option value="">+ Add Floor</option>
                    ${d}
                  </select>
                  <select class="action-btn room" id="roomSelect" style="cursor:pointer;padding-right:30px;">
                    <option value="">+ Add Room</option>
                    ${p}
                  </select>
                  <button class="action-btn primary" data-action="addItem">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                    Add Item
                  </button>
                </div>
              </div>
            </div>

            <!-- Additional Work Table -->
            <div class="quotation-card" id="additionalSection">
              <div class="quotation-header">
                <div class="quotation-title">
                  <h2>Additional Work</h2>
                  <span class="badge" id="additionalItemCount">${this.getItemCount(e.additionalItems)} items</span>
                </div>
                <div class="quotation-total">
                  <span class="label">Section Total</span>
                  <span class="amount">₹<span id="additionalTotal">${c(e.additionalTotal||0)}</span></span>
                </div>
              </div>
              <div class="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th style="width:50px;">#</th>
                      <th style="min-width:250px;">Description</th>
                      <th class="center" style="width:90px;">Height</th>
                      <th class="center" style="width:90px;">Width</th>
                      <th class="center" style="width:100px;">Sq.ft</th>
                      <th class="center" style="width:110px;">Rate</th>
                      <th class="center" style="width:110px;">Amount</th>
                      <th class="center" style="width:80px;">Qty</th>
                      <th class="center" style="width:120px;">Total</th>
                      <th style="width:70px;"></th>
                    </tr>
                  </thead>
                  <tbody id="additionalTableBody">
                    ${this.buildTableRows(e.additionalItems||[],"additional")}
                  </tbody>
                </table>
              </div>
              <div class="quick-actions" style="margin:0; border-radius:0 0 12px 12px; box-shadow:none; border-top:1px solid var(--gray-100);">
                <div class="action-btns" style="margin-left:auto;">
                  <button class="action-btn primary" data-action="addAdditionalItem">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                    Add Item
                  </button>
                </div>
              </div>
            </div>

            <!-- Summary -->
            <div class="summary-card">
              <div class="summary-grid">
                <div class="summary-item">
                  <div class="label">Main Work</div>
                  <div class="value" id="summaryMainTotal">₹${c(e.mainTotal||0)}</div>
                </div>
                <div class="summary-item">
                  <div class="label">Additional Work</div>
                  <div class="value" id="summaryAdditionalTotal">₹${c(e.additionalTotal||0)}</div>
                </div>
                <div class="summary-item primary">
                  <div class="label">Grand Total</div>
                  <div class="value" id="summaryGrandTotal">₹${c(r.grandTotal)}</div>
                </div>
              </div>
            </div>

            <!-- Pricing Bar -->
            <div class="pricing-bar">
              <div class="pricing-item">
                <div class="icon">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                </div>
                <div class="info">
                  <div class="label">Subtotal</div>
                  <div class="value" id="subtotalDisplay">₹${c(r.subtotal)}</div>
                </div>
              </div>

              <div class="pricing-divider"></div>

              <div class="pricing-item">
                <div class="info">
                  <div class="label">Discount</div>
                  <div class="pricing-control">
                    <select id="discountType">
                      <option value="amount" ${o.discountType==="amount"?"selected":""}>₹</option>
                      <option value="percent" ${o.discountType==="percent"?"selected":""}>%</option>
                    </select>
                    <input type="number" id="discountValue" value="${o.discountValue||0}">
                  </div>
                </div>
              </div>

              <div class="pricing-divider"></div>

              <div class="pricing-item">
                <div class="info">
                  <div class="label">GST</div>
                  <div class="toggle-wrapper">
                    <div class="toggle ${o.gstEnabled?"active":""}" id="gstToggle"></div>
                    <select id="gstRate">
                      <option value="5" ${o.gstRate==5?"selected":""}>5%</option>
                      <option value="12" ${o.gstRate==12?"selected":""}>12%</option>
                      <option value="18" ${o.gstRate==18?"selected":""}>18%</option>
                      <option value="28" ${o.gstRate==28?"selected":""}>28%</option>
                    </select>
                    <span id="gstDisplay" style="font-weight:600;">₹${c(r.gst)}</span>
                  </div>
                </div>
              </div>

              <div class="pricing-total">
                <div class="label">Final Total</div>
                <div class="amount" id="grandTotalDisplay">₹${c(r.grandTotal)}</div>
              </div>
            </div>

            <!-- Payment Stages -->
            <div class="payment-card">
              <div class="payment-header">
                <h3>Payment Schedule</h3>
              </div>
              <div class="payment-stages">
                <div class="stage" data-action="openStageReceipt" data-stage="Booking" data-percent="5" style="cursor:pointer;">
                  <div class="percent">5%</div>
                  <div class="name">Booking</div>
                  <div class="amount">₹${c(l.booking)}</div>
                </div>
                <span class="stage-arrow">→</span>
                <div class="stage" data-action="openStageReceipt" data-stage="Production" data-percent="45" style="cursor:pointer;">
                  <div class="percent">45%</div>
                  <div class="name">Production</div>
                  <div class="amount">₹${c(l.production)}</div>
                </div>
                <span class="stage-arrow">→</span>
                <div class="stage" data-action="openStageReceipt" data-stage="Factory" data-percent="45" style="cursor:pointer;">
                  <div class="percent">45%</div>
                  <div class="name">Factory</div>
                  <div class="amount">₹${c(l.factory)}</div>
                </div>
                <span class="stage-arrow">→</span>
                <div class="stage" data-action="openStageReceipt" data-stage="Handover" data-percent="5" style="cursor:pointer;">
                  <div class="percent">5%</div>
                  <div class="name">Handover</div>
                  <div class="amount">₹${c(l.handover)}</div>
                </div>
              </div>
            </div>

            <!-- Footer Grid -->
            <div class="footer-grid">
              <!-- Bank Details -->
              <div class="footer-card">
                <h4>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
                  Bank Details
                </h4>
                <div class="bank-details">
                  <div class="bank-item">
                    <div class="label">Bank</div>
                    <div class="value">${((b=(g=o.bankAccounts)==null?void 0:g[o.selectedBank||0])==null?void 0:b.bank)||"HDFC Bank"}</div>
                  </div>
                  <div class="bank-item">
                    <div class="label">Account Number</div>
                    <div class="value">${((A=(x=o.bankAccounts)==null?void 0:x[o.selectedBank||0])==null?void 0:A.accNo)||"1234567890"}</div>
                  </div>
                  <div class="bank-item">
                    <div class="label">IFSC Code</div>
                    <div class="value">${((C=(R=o.bankAccounts)==null?void 0:R[o.selectedBank||0])==null?void 0:C.ifsc)||"HDFC0001234"}</div>
                  </div>
                  <div class="bank-item">
                    <div class="label">UPI ID</div>
                    <div class="value">${((D=(I=o.bankAccounts)==null?void 0:I[o.selectedBank||0])==null?void 0:D.upi)||"mayainteriors@upi"}</div>
                  </div>
                </div>
              </div>

              <!-- Terms -->
              <div class="footer-card">
                <h4>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                  Terms & Conditions
                </h4>
                <div class="terms-list">
                  <span class="term-tag"><span class="dot"></span> Rates valid for 30 days</span>
                  <span class="term-tag"><span class="dot"></span> Warranty as per product</span>
                  <span class="term-tag"><span class="dot"></span> Changes may affect price</span>
                  <span class="term-tag"><span class="dot"></span> Site must be ready</span>
                  <span class="term-tag"><span class="dot"></span> No cancellation after production</span>
                </div>
              </div>
            </div>

            <!-- Action Bar -->
            <div class="action-bar">
              <div class="action-bar-left">
                <div class="brand-footer">
                  <div class="logo">M</div>
                  <div class="info">
                    <div class="name">Maya Interiors</div>
                    <div class="tagline">Design . Build . Transform</div>
                  </div>
                </div>
                <div class="contact-items">
                  <div class="contact-item">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                    <input type="text" id="companyPhone" data-field="settings.phone" value="${s(o.phone||"9840808883")}">
                  </div>
                  <div class="contact-item">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                    <input type="text" id="companyEmail" data-field="settings.email" value="${s(o.email||"info@mayainteriors.com")}">
                  </div>
                  <div class="contact-item">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                    <input type="text" id="companyLocation" data-field="settings.location" value="${s(o.location||"Chennai")}">
                  </div>
                </div>
              </div>
              <div class="action-bar-right">
                <button class="action-bar-btn" data-action="share">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
                  Share
                </button>
                <button class="action-bar-btn primary" data-action="save">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                  Save Quote
                </button>
              </div>
            </div>

          </div>
        </main>
      </div>

      <!-- Toast -->
      <div class="toast" id="toast"></div>
    `}buildTableRows(t,e="main"){let o="",a=1;const s=this.escapeAttr;return t.forEach((r,l)=>{if(r.type==="floor")o+=`
          <tr class="floor-row" data-index="${l}" data-section="${e}">
            <td colspan="7">
              <div class="floor-label">
                <div class="icon"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg></div>
                <span class="floor-name" data-action="editName" style="cursor:pointer;">${s(r.name)}</span>
                <input type="text" class="edit-name-input" value="${s(r.name)}" style="display:none;">
              </div>
            </td>
            <td colspan="2">
              <div class="floor-total-display">
                <span>Floor Total</span>
                <span class="floor-total-amount">₹${c(r.total||0)}</span>
              </div>
            </td>
            <td>
              <div class="row-actions" style="opacity:1;">
                <button class="row-btn" data-action="editRow" data-index="${l}" data-section="${e}">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                </button>
                <button class="row-btn delete" data-action="deleteRow" data-index="${l}" data-section="${e}">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
              </div>
            </td>
          </tr>`;else if(r.type==="room")o+=`
          <tr class="room-row" data-index="${l}" data-section="${e}">
            <td colspan="7">
              <div class="room-label">
                <div class="icon"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg></div>
                <span class="room-name" data-action="editName" style="cursor:pointer;">${s(r.name)}</span>
                <input type="text" class="edit-name-input" value="${s(r.name)}" style="display:none;">
              </div>
            </td>
            <td colspan="2">
              <div class="room-total-display">
                <span>Room Total</span>
                <span class="room-total-amount">₹${c(r.total||0)}</span>
              </div>
            </td>
            <td>
              <div class="row-actions" style="opacity:1;">
                <button class="row-btn" data-action="editRow" data-index="${l}" data-section="${e}">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                </button>
                <button class="row-btn delete" data-action="deleteRow" data-index="${l}" data-section="${e}">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
              </div>
            </td>
          </tr>`;else if(r.type==="item"){const d=parseInt(r.qty)||1,p=Array.from({length:20},(h,g)=>`<option value="${g+1}" ${g+1===d?"selected":""}>${g+1}</option>`).join("");o+=`
          <tr class="item-row" data-index="${l}" data-section="${e}">
            <td><div class="row-num">${a++}</div></td>
            <td><input type="text" class="item-desc" data-field="description" value="${s(r.description)}" placeholder="Item description"></td>
            <td><input type="number" class="h-val" data-field="height" value="${r.height||""}" placeholder="H" step="0.1"></td>
            <td><input type="number" class="w-val" data-field="width" value="${r.width||""}" placeholder="W" step="0.1"></td>
            <td><input type="number" class="sqft-val calc-field" value="${r.sqft||""}" readonly></td>
            <td><input type="number" class="rate-val" data-field="rate" value="${r.rate||""}" placeholder="Rate"></td>
            <td><input type="number" class="amount-val" data-field="amount" value="${r.amount||""}" placeholder="Amount"></td>
            <td><select class="qty-val qty-select" data-field="qty">${p}</select></td>
            <td><input type="number" class="total-val total-field" value="${r.total||""}" readonly></td>
            <td>
              <div class="row-actions">
                <button class="row-btn" data-action="addRowBelow" data-index="${l}" data-section="${e}">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                </button>
                <button class="row-btn delete" data-action="deleteRow" data-index="${l}" data-section="${e}">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
              </div>
            </td>
          </tr>`}}),o}getItemCount(t){return t?t.filter(e=>e.type==="item").length:0}events(){return{'input [data-field^="client."]':this.handleClientInput,"change #quoteDate":t=>n.set("quotation.date",t.target.value),"change #quoteNumber":t=>n.set("quotation.number",t.target.value),"keypress #quickInput":this.handleQuickEntry,"change #floorSelect":this.addFloor,"change #roomSelect":this.addRoom,'click [data-action="addItem"]':this.addItem,'click [data-action="addAdditionalItem"]':this.addAdditionalItem,"input .item-row input":this.handleItemInput,"change .item-row select":this.handleItemInput,'click [data-action="deleteRow"]':this.deleteRow,'click [data-action="addRowBelow"]':this.addRowBelow,'click [data-action="editRow"]':this.editRowName,'click [data-action="editName"]':this.editRowName,"blur .edit-name-input":this.saveRowName,"keypress .edit-name-input":this.handleEditNameKeypress,'click [data-action="save"]':this.save,'click [data-action="pdf"]':this.generatePDF,'click [data-action="print"]':this.print,'click [data-action="new"]':this.newQuote,"change #discountType":this.updateSettings,"input #discountValue":this.updateSettings,"click #gstToggle":this.toggleGST,"change #gstRate":this.updateSettings,'click [data-action="shortcuts"]':this.openShortcuts,'click [data-action="items"]':this.openItems,'click [data-action="clients"]':this.openClients,'click [data-action="settings"]':this.openSettings,'click [data-action="receipt"]':this.openReceipt,'click [data-action="openStageReceipt"]':this.openStageReceipt,'click [data-action="share"]':this.shareWhatsApp,'input [data-field^="settings."]':this.handleSettingsInput}}handleClientInput(t){const e=t.target.dataset.field;e&&n.set(e,t.target.value)}handleQuickEntry(t){if(t.key!=="Enter")return;const e=t.target,o=e.value.trim().toLowerCase();if(!o)return;const a=n.get("shortcuts");if(a.floors[o]){this.addFloorByName(a.floors[o]),e.value="";return}if(a.rooms[o]){this.addRoomByName(a.rooms[o]),e.value="";return}if(a.items[o]){const s=a.items[o];this.addItemWithData(s.name,s.rate),e.value="";return}this.addItemWithData(e.value),e.value=""}addFloor(t){const e=t.target.value;if(e){if(e==="__custom__"){const o=prompt("Enter Floor Name:");o&&this.addFloorByName(o.toUpperCase())}else this.addFloorByName(e);t.target.value=""}}addFloorByName(t){const e=[...n.get("quotation.mainItems")||[]];e.push({type:"floor",name:t,total:0,id:Date.now()}),n.set("quotation.mainItems",e),this.recalculateAndRender()}addRoom(t){const e=t.target.value;if(e){if(e==="__custom__"){const o=prompt("Enter Room Name:");o&&this.addRoomByName(o.toUpperCase())}else this.addRoomByName(e);t.target.value=""}}addRoomByName(t){const e=[...n.get("quotation.mainItems")||[]];e.push({type:"room",name:t,total:0,id:Date.now()}),n.set("quotation.mainItems",e),this.recalculateAndRender()}addItem(){this.addItemWithData("",0,"main")}addAdditionalItem(){this.addItemWithData("",0,"additional")}addItemWithData(t="",e=0,o="main"){const a=o==="additional"?"quotation.additionalItems":"quotation.mainItems",s=[...n.get(a)||[]];s.push({type:"item",description:t,height:"",width:"",sqft:"",rate:e||"",amount:"",qty:1,total:"",id:Date.now()}),n.set(a,s),this.recalculateAndRender(),this.focusLastItemDescription(o)}focusLastItemDescription(t="main"){requestAnimationFrame(()=>{const e=document.getElementById(t==="additional"?"additionalTableBody":"mainTableBody");if(!e)return;const o=e.querySelectorAll(".item-row"),a=o[o.length-1];if(a){const s=a.querySelector("input.item-desc");s&&s.focus()}})}addRowBelow(t){const e=t.target.closest("[data-index]"),o=parseInt(e.dataset.index),s=(e.dataset.section||"main")==="additional"?"quotation.additionalItems":"quotation.mainItems",r=[...n.get(s)||[]];r.splice(o+1,0,{type:"item",description:"",height:"",width:"",sqft:"",rate:"",amount:"",qty:1,total:"",id:Date.now()}),n.set(s,r),this.recalculateAndRender()}handleItemInput(t){const e=t.target.closest(".item-row");if(!e)return;const o=parseInt(e.dataset.index),a=e.dataset.section||"main",s=t.target.dataset.field,r=t.target.value,l=a==="additional"?"quotation.additionalItems":"quotation.mainItems";if(s){const d=[...n.get(l)||[]];d[o][s]=r;const p=y.calculateItemRow(d[o]);d[o].sqft=p.sqft,d[o].amount=p.amount,d[o].total=p.total,n.set(l,d,!1),this.updateRowCalculations(e,p),this.updateTotals()}}updateRowCalculations(t,e){const o=t.querySelector(".sqft-val"),a=t.querySelector(".amount-val"),s=t.querySelector(".total-val"),r=document.activeElement;o&&(o.value=e.sqft||""),a&&a!==r&&(a.value=e.amount||""),s&&(s.value=e.total||"")}updateTotals(){const t=y.recalculateAll(),e=n.get("quotation.mainTotal")||0,o=n.get("quotation.additionalTotal")||0,a=document.getElementById("mainTotal"),s=document.getElementById("additionalTotal");a&&(a.textContent=c(e)),s&&(s.textContent=c(o));const r=document.getElementById("summaryMainTotal"),l=document.getElementById("summaryAdditionalTotal"),d=document.getElementById("summaryGrandTotal");r&&(r.textContent="₹"+c(e)),l&&(l.textContent="₹"+c(o)),d&&(d.textContent="₹"+c(t.grandTotal));const p=document.getElementById("grandTotalDisplay");p&&(p.textContent="₹"+c(t.grandTotal));const h=document.getElementById("subtotalDisplay"),g=document.getElementById("gstDisplay");h&&(h.textContent="₹"+c(t.subtotal)),g&&(g.textContent="₹"+c(t.gst)),this.updateFloorRoomTotals("main"),this.updateFloorRoomTotals("additional")}updateFloorRoomTotals(t){const e=t==="additional"?"additionalTableBody":"mainTableBody",o=document.getElementById(e);if(!o)return;const a=t==="additional"?"quotation.additionalItems":"quotation.mainItems",s=n.get(a)||[];o.querySelectorAll("tr[data-index]").forEach(r=>{const l=parseInt(r.dataset.index),d=s[l];if(d&&(d.type==="floor"||d.type==="room")){const p=r.querySelector(".floor-total-amount, .room-total-amount");p&&(p.textContent="₹"+c(d.total||0))}})}calculateRow(t,e,o="main"){const a=o==="additional"?"quotation.additionalItems":"quotation.mainItems",s=[...n.get(a)||[]],r=y.calculateItemRow(s[e]);s[e].sqft=r.sqft,s[e].amount=r.amount,s[e].total=r.total,n.set(a,s,!1)}deleteRow(t){const e=t.target.closest("[data-index]"),o=parseInt(e.dataset.index),s=(e.dataset.section||"main")==="additional"?"quotation.additionalItems":"quotation.mainItems",r=[...n.get(s)||[]],l=r[o];if(l.type==="floor"||l.type==="room"){if(!confirm(`Delete this ${l.type} and all items below it?`))return;let d=o+1;for(;d<r.length&&!(r[d].type===l.type||l.type==="room"&&r[d].type==="floor");)d++;r.splice(o,d-o)}else r.splice(o,1);n.set(s,r),this.recalculateAndRender()}editRowName(t){const e=t.target.closest("tr"),o=e.querySelector(".floor-name, .room-name"),a=e.querySelector(".edit-name-input");o&&a&&(o.style.display="none",a.style.display="inline-block",a.focus(),a.select())}handleEditNameKeypress(t){t.key==="Enter"&&t.target.blur()}saveRowName(t){const e=t.target,o=e.closest("tr"),a=o.querySelector(".floor-name, .room-name"),s=parseInt(o.dataset.index),l=(o.dataset.section||"main")==="additional"?"quotation.additionalItems":"quotation.mainItems",d=e.value.trim().toUpperCase()||(a.classList.contains("floor-name")?"FLOOR":"ROOM"),p=[...n.get(l)||[]];p[s]&&(p[s].name=d,n.set(l,p)),a&&(a.textContent=d,a.style.display="inline"),e.style.display="none"}updateSettings(t){const e=t.target.id,o=t.target.type==="number"?parseFloat(t.target.value):t.target.value;e==="discountType"&&n.set("settings.discountType",o),e==="discountValue"&&n.set("settings.discountValue",o),e==="gstRate"&&n.set("settings.gstRate",o),e==="discountValue"?this.updatePricingDisplay():this.recalculateAndRender()}updatePricingDisplay(){const t=y.calculateGrandTotal(),e=document.getElementById("subtotalDisplay"),o=document.getElementById("gstDisplay"),a=document.getElementById("grandTotalDisplay"),s=document.getElementById("summaryGrandTotal");e&&(e.textContent="₹"+c(t.subtotal)),o&&(o.textContent="₹"+c(t.gst)),a&&(a.textContent="₹"+c(t.grandTotal)),s&&(s.textContent="₹"+c(t.grandTotal))}toggleGST(){const t=n.get("settings.gstEnabled");n.set("settings.gstEnabled",!t),this.recalculateAndRender()}recalculateAndRender(){y.recalculateAll(),this.render()}save(){const t=n.get("quotation.number");w.saveAll(),w.saveToClients(t),this._isDirty=!1,u("Saved: "+t,!0)}async generatePDF(){const t=_.validateQuotation();if(!(t.length>0&&!confirm(`${t.length} incomplete items found. Generate PDF anyway?`)))try{await j.generatePDF()}catch(e){console.error("PDF generation failed:",e)}}print(){j.print()}newQuote(){this._isDirty&&!confirm("Create new quotation? Unsaved changes will be lost.")||(n.reset(),n.set("quotation.number",Y()),n.set("quotation.date",P()),this._isDirty=!1,this.render(),u("New quotation created",!0))}openShortcuts(){window.MayaModals&&window.MayaModals.shortcutManager&&window.MayaModals.shortcutManager.open()}openItems(){window.MayaModals&&window.MayaModals.itemManager&&window.MayaModals.itemManager.open()}openClients(){window.MayaModals&&window.MayaModals.clients&&window.MayaModals.clients.open()}openSettings(){window.MayaModals&&window.MayaModals.bank&&window.MayaModals.bank.open()}openReceipt(){window.MayaModals&&window.MayaModals.receipt&&window.MayaModals.receipt.open()}openStageReceipt(t){const e=t.target.closest("[data-stage]");if(!e)return;const o=e.dataset.stage,a=e.dataset.percent;window.MayaModals&&window.MayaModals.receipt&&(window.MayaModals.receipt.setStage(o,a),window.MayaModals.receipt.open())}shareWhatsApp(){const t=n.get("client"),e=n.get("quotation"),o=y.calculateGrandTotal(),a=t.name||"Customer",s=e.number||"MI-2024-001",r=c(o.grandTotal),l=`*Maya Interiors - Quotation*

Dear ${a},

Thank you for choosing Maya Interiors!

*Quote #:* ${s}
*Date:* ${e.date||new Date().toLocaleDateString()}
*Total Amount:* ₹${r}

For any queries, please contact us.

_Design . Build . Transform_
Maya Interiors`,d=encodeURIComponent(l),p=t.contact?t.contact.replace(/\D/g,""):"",h=p?`https://wa.me/${p}?text=${d}`:`https://wa.me/?text=${d}`;window.open(h,"_blank"),u("Opening WhatsApp...",!0)}handleSettingsInput(t){const e=t.target.dataset.field;e&&n.set(e,t.target.value)}afterRender(){if(!this._initialRenderDone){this._initialRenderDone=!0;const t=this.$("#quickInput");t&&t.focus()}}}class M{constructor(t,e={}){this.id=t,this.options={maxWidth:"600px",closeOnOverlay:!0,...e},this.isOpen=!1,this.onCloseCallback=null}title(){return"Modal"}body(){return""}footer(){return""}afterOpen(){}beforeClose(){}render(){return`
      <div class="modal-overlay" id="${this.id}" style="display:none;">
        <div class="modal" style="max-width:${this.options.maxWidth};">
          <div class="modal-header">
            <h3>${this.title()}</h3>
            <button class="modal-close" data-action="close">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            ${this.body()}
          </div>
          ${this.footer()?`<div class="modal-footer">${this.footer()}</div>`:""}
        </div>
      </div>
    `}open(t=null){this.onCloseCallback=t;const e=k(`#${this.id}`);if(e){e.style.display="flex",e.classList.add("show"),this.isOpen=!0;const o=e.querySelector('[data-action="close"]');o&&(o.onclick=()=>this.close()),this.options.closeOnOverlay&&(e.onclick=a=>{a.target===e&&this.close()}),this.escHandler=a=>{a.key==="Escape"&&this.close()},document.addEventListener("keydown",this.escHandler),this.afterOpen()}}close(){this.beforeClose();const t=k(`#${this.id}`);t&&(t.classList.remove("show"),t.style.display="none",this.isOpen=!1,this.escHandler&&document.removeEventListener("keydown",this.escHandler),this.onCloseCallback&&this.onCloseCallback())}updateBody(t){const e=k(`#${this.id}`);if(e){const o=e.querySelector(".modal-body");o&&G(o,t)}}$(t){const e=k(`#${this.id}`);return e?e.querySelector(t):null}$$(t){const e=k(`#${this.id}`);return e?e.querySelectorAll(t):[]}}class nt extends M{constructor(){super("shortcutManagerModal",{maxWidth:"700px"})}title(){return"Manage Shortcuts"}body(){return`
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
        <!-- Floor Shortcuts -->
        <div>
          <h4 style="margin:0 0 12px;color:#C4705A;font-size:14px;">Floor Shortcuts</h4>
          <div id="floorShortcutsList" style="display:flex;flex-direction:column;gap:8px;max-height:250px;overflow-y:auto;"></div>
        </div>
        <!-- Room Shortcuts -->
        <div>
          <h4 style="margin:0 0 12px;color:#8B9A7D;font-size:14px;">Room Shortcuts</h4>
          <div id="roomShortcutsList" style="display:flex;flex-direction:column;gap:8px;max-height:250px;overflow-y:auto;"></div>
        </div>
      </div>

      <!-- Add New Shortcut -->
      <div style="margin-top:20px;padding-top:20px;border-top:1px solid var(--gray-200);">
        <h4 style="margin:0 0 12px;font-size:14px;">Add New Shortcut</h4>
        <div style="display:flex;gap:10px;align-items:flex-end;">
          <div style="flex:0 0 100px;">
            <label style="font-size:11px;color:var(--gray-500);display:block;margin-bottom:4px;">Type</label>
            <select id="shortcutType" style="width:100%;padding:8px;border:1px solid var(--gray-200);border-radius:6px;">
              <option value="floor">Floor</option>
              <option value="room">Room</option>
            </select>
          </div>
          <div style="flex:0 0 80px;">
            <label style="font-size:11px;color:var(--gray-500);display:block;margin-bottom:4px;">Code</label>
            <input type="text" id="shortcutCode" maxlength="3" placeholder="e.g. gf" style="width:100%;padding:8px;border:1px solid var(--gray-200);border-radius:6px;">
          </div>
          <div style="flex:1;">
            <label style="font-size:11px;color:var(--gray-500);display:block;margin-bottom:4px;">Name</label>
            <input type="text" id="shortcutName" placeholder="e.g. GROUND FLOOR" style="width:100%;padding:8px;border:1px solid var(--gray-200);border-radius:6px;">
          </div>
          <button id="addShortcutBtn" style="padding:8px 16px;background:var(--primary);color:white;border:none;border-radius:6px;cursor:pointer;font-weight:500;">Add</button>
        </div>
      </div>
    `}footer(){return`
      <button class="modal-btn cancel" data-action="reset">Reset to Default</button>
      <button class="modal-btn primary" data-action="close">Done</button>
    `}afterOpen(){this.renderLists(),this.bindEvents()}bindEvents(){const t=this.$("#addShortcutBtn");t&&(t.onclick=()=>this.addShortcut());const e=this.$('[data-action="reset"]');e&&(e.onclick=()=>this.resetShortcuts());const o=this.$("#shortcutCode"),a=this.$("#shortcutName");o&&(o.onkeypress=s=>s.key==="Enter"&&this.addShortcut()),a&&(a.onkeypress=s=>s.key==="Enter"&&this.addShortcut())}renderLists(){const t=n.get("shortcuts");let e="";for(const[r,l]of Object.entries(t.floors))e+=`
        <div style="display:flex;align-items:center;gap:8px;padding:8px;background:#FDF6EC;border-radius:6px;">
          <code style="background:#C4705A;color:white;padding:2px 8px;border-radius:4px;font-size:12px;">${r}</code>
          <span style="flex:1;">${l}</span>
          <button onclick="window.MayaModals.shortcutManager.deleteShortcut('floor','${r}')" style="background:#ff4444;color:white;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:11px;">Delete</button>
        </div>
      `;const o=this.$("#floorShortcutsList");o&&(o.innerHTML=e||'<div style="color:#8C7E6F;font-size:12px;">No floor shortcuts</div>');let a="";for(const[r,l]of Object.entries(t.rooms))a+=`
        <div style="display:flex;align-items:center;gap:8px;padding:8px;background:#d1fae5;border-radius:6px;">
          <code style="background:#8B9A7D;color:white;padding:2px 8px;border-radius:4px;font-size:12px;">${r}</code>
          <span style="flex:1;">${l}</span>
          <button onclick="window.MayaModals.shortcutManager.deleteShortcut('room','${r}')" style="background:#ff4444;color:white;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:11px;">Delete</button>
        </div>
      `;const s=this.$("#roomShortcutsList");s&&(s.innerHTML=a||'<div style="color:#8C7E6F;font-size:12px;">No room shortcuts</div>')}addShortcut(){const t=this.$("#shortcutType").value,e=this.$("#shortcutCode").value.toLowerCase().trim(),o=this.$("#shortcutName").value.toUpperCase().trim();if(!e||!o){u("Please enter code and name",!1);return}if(e.length>3){u("Code should be 1-3 characters",!1);return}const a=n.get("shortcuts");t==="floor"?a.floors[e]=o:a.rooms[e]=o,n.set("shortcuts",a),this.$("#shortcutCode").value="",this.$("#shortcutName").value="",this.renderLists(),u("Shortcut added!",!0)}deleteShortcut(t,e){const o=n.get("shortcuts");t==="floor"?delete o.floors[e]:delete o.rooms[e],n.set("shortcuts",o),this.renderLists(),u("Shortcut deleted!",!0)}resetShortcuts(){if(!confirm("Reset all shortcuts to default?"))return;const t=n.get("shortcuts");t.floors={gf:"GROUND FLOOR",ff:"FIRST FLOOR",sf:"SECOND FLOOR",tf:"THIRD FLOOR",rf:"ROOF FLOOR",bf:"BASEMENT"},t.rooms={lr:"LIVING ROOM",br:"BEDROOM",mb:"MASTER BEDROOM",kt:"KITCHEN",ba:"BATHROOM",dr:"DINING ROOM",po:"POOJA ROOM",st:"STUDY ROOM",bl:"BALCONY",ha:"HALL",ut:"UTILITY",sk:"STORE"},n.set("shortcuts",t),this.renderLists(),u("Shortcuts reset to default!",!0)}}class rt extends M{constructor(){super("itemManagerModal",{maxWidth:"700px"})}title(){return"Manage Items"}body(){return`
      <div style="margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;">
        <span style="color:var(--gray-500);font-size:13px;"><span id="itemCount">0</span> items</span>
      </div>

      <!-- Items List -->
      <div id="itemManagerList" style="display:flex;flex-direction:column;gap:8px;max-height:300px;overflow-y:auto;margin-bottom:20px;"></div>

      <!-- Add New Item -->
      <div style="padding-top:20px;border-top:1px solid var(--gray-200);">
        <h4 style="margin:0 0 12px;font-size:14px;">Add New Item</h4>
        <div style="display:flex;gap:10px;align-items:flex-end;">
          <div style="flex:0 0 80px;">
            <label style="font-size:11px;color:var(--gray-500);display:block;margin-bottom:4px;">Code</label>
            <input type="text" id="newItemCode" maxlength="4" placeholder="e.g. tv" style="width:100%;padding:8px;border:1px solid var(--gray-200);border-radius:6px;">
          </div>
          <div style="flex:1;">
            <label style="font-size:11px;color:var(--gray-500);display:block;margin-bottom:4px;">Item Name</label>
            <input type="text" id="newItemName" placeholder="e.g. TV Unit" style="width:100%;padding:8px;border:1px solid var(--gray-200);border-radius:6px;">
          </div>
          <div style="flex:0 0 100px;">
            <label style="font-size:11px;color:var(--gray-500);display:block;margin-bottom:4px;">Rate (₹)</label>
            <input type="number" id="newItemRate" placeholder="0" style="width:100%;padding:8px;border:1px solid var(--gray-200);border-radius:6px;">
          </div>
          <button id="addItemBtn" style="padding:8px 16px;background:var(--primary);color:white;border:none;border-radius:6px;cursor:pointer;font-weight:500;">Add</button>
        </div>
      </div>
    `}footer(){return`
      <button class="modal-btn cancel" data-action="reset">Reset to Default</button>
      <button class="modal-btn primary" data-action="close">Done</button>
    `}afterOpen(){this.renderList(),this.bindEvents()}bindEvents(){const t=this.$("#addItemBtn");t&&(t.onclick=()=>this.addItem());const e=this.$('[data-action="reset"]');e&&(e.onclick=()=>this.resetItems()),["#newItemCode","#newItemName","#newItemRate"].forEach(o=>{const a=this.$(o);a&&(a.onkeypress=s=>s.key==="Enter"&&this.addItem())})}renderList(){const e=n.get("shortcuts").items||{};this.$("#itemCount").textContent=Object.keys(e).length;let o="";for(const[s,r]of Object.entries(e))o+=`
        <div style="display:flex;align-items:center;gap:8px;padding:10px;background:#FDF6EC;border-radius:6px;">
          <code style="background:#6366f1;color:white;padding:2px 8px;border-radius:4px;font-size:11px;min-width:35px;text-align:center;">${s}</code>
          <span style="flex:2;font-weight:500;">${r.name}</span>
          <span style="flex:1;color:#C4705A;font-weight:600;">₹${c(r.rate)}</span>
          <button onclick="window.MayaModals.itemManager.editItem('${s}')" style="background:#5D4E37;color:white;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;font-size:11px;">Edit</button>
          <button onclick="window.MayaModals.itemManager.deleteItem('${s}')" style="background:#ff4444;color:white;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;font-size:11px;">Delete</button>
        </div>
      `;const a=this.$("#itemManagerList");a&&(a.innerHTML=o||'<div style="color:#8C7E6F;font-size:12px;text-align:center;padding:20px;">No items. Add some below.</div>')}addItem(){const t=this.$("#newItemCode").value.toLowerCase().trim(),e=this.$("#newItemName").value.trim(),o=parseInt(this.$("#newItemRate").value)||0;if(!t){u("Please enter shortcut code",!1);return}if(!e){u("Please enter item name",!1);return}if(t.length>4){u("Code should be 1-4 characters",!1);return}const a=n.get("shortcuts");a.items[t]={name:e,rate:o},n.set("shortcuts",a),this.$("#newItemCode").value="",this.$("#newItemName").value="",this.$("#newItemRate").value="",this.renderList(),u("Item added!",!0)}editItem(t){const e=n.get("shortcuts"),o=e.items[t];if(!o)return;const a=prompt("Edit item name:",o.name);if(a===null)return;const s=prompt("Edit rate:",o.rate);s!==null&&(e.items[t]={name:a.trim()||o.name,rate:parseInt(s)||o.rate},n.set("shortcuts",e),this.renderList(),u("Item updated!",!0))}deleteItem(t){var o;const e=n.get("shortcuts");confirm(`Delete "${(o=e.items[t])==null?void 0:o.name}"?`)&&(delete e.items[t],n.set("shortcuts",e),this.renderList(),u("Item deleted!",!0))}resetItems(){if(!confirm("Reset all item shortcuts to default?"))return;const t=n.get("shortcuts");t.items={tv:{name:"TV Unit",rate:8e4},ws:{name:"Wardrobe Shutter",rate:1600},kb:{name:"Kitchen bottom shutter",rate:850},ls:{name:"Loft shutter",rate:750},pu:{name:"Pooja Unit",rate:1400},cu:{name:"Crockery Unit",rate:1400},fc:{name:"False Ceiling",rate:120},pt:{name:"Painting",rate:22},ep:{name:"Electrical Point",rate:450},kbb:{name:"Kitchen bottom box",rate:850},tb:{name:"Top box",rate:1400},cp:{name:"Cupboard",rate:750}},n.set("shortcuts",t),this.renderList(),u("Items reset to default!",!0)}}class lt extends M{constructor(){super("clientsModal",{maxWidth:"900px"}),this.onLoadCallback=null}title(){return"Saved Quotations"}body(){return`
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <span id="clientsCountText" style="color:var(--gray-500);font-size:13px;">0 quotations saved</span>
        <div style="display:flex;gap:10px;">
          <input type="text" id="clientSearchInput" placeholder="Search..." oninput="window.MayaModals.clients.filterClients()" style="padding:8px 14px;border:1px solid var(--gray-200);border-radius:6px;width:200px;">
        </div>
      </div>

      <!-- Clients Grid -->
      <div id="clientsPageBody" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(280px, 1fr));gap:16px;max-height:500px;overflow-y:auto;"></div>

      <!-- Empty State -->
      <div id="clientsEmptyState" style="display:none;text-align:center;padding:60px 20px;">
        <svg width="64" height="64" fill="none" stroke="#9ca3af" viewBox="0 0 24 24" style="margin:0 auto 16px;">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
        <h3 style="color:var(--gray-700);margin:0 0 8px;">No Saved Quotations</h3>
        <p style="color:var(--gray-500);font-size:14px;">Save your current quotation to see it here.</p>
      </div>
    `}footer(){return`
      <button class="modal-btn primary" data-action="close">Close</button>
    `}afterOpen(){this.renderClients()}setOnLoad(t){this.onLoadCallback=t}renderClients(){const t=w.getClients(),e=Object.keys(t).sort().reverse(),o=this.$("#clientsCountText"),a=this.$("#clientsPageBody"),s=this.$("#clientsEmptyState");if(o&&(o.textContent=`${e.length} quotation${e.length!==1?"s":""} saved`),e.length===0){a&&(a.style.display="none"),s&&(s.style.display="block");return}a&&(a.style.display="grid"),s&&(s.style.display="none");let r="";e.forEach(l=>{const d=t[l],p=d.quoteDate?new Date(d.quoteDate).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}):"",h=d.savedAt?new Date(d.savedAt).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}):"";r+=`
        <div class="client-card-item" data-id="${l}" style="background:white;border-radius:12px;padding:20px;box-shadow:0 1px 3px rgba(0,0,0,0.1);border:1px solid var(--gray-200);transition:all 0.2s;cursor:pointer;" onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)';this.style.transform='translateY(-2px)'" onmouseout="this.style.boxShadow='0 1px 3px rgba(0,0,0,0.1)';this.style.transform='none'">
          <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:12px;">
            <div style="background:linear-gradient(135deg, #C4705A, #e8927a);color:white;padding:6px 12px;border-radius:6px;font-size:13px;font-weight:600;">${l}</div>
            <div style="font-size:12px;color:var(--gray-500);">${p}</div>
          </div>
          <h3 style="font-size:16px;font-weight:600;color:var(--gray-900);margin:0 0 4px 0;">${d.clientName||"Unnamed"}</h3>
          <p style="font-size:13px;color:var(--gray-500);margin:0 0 12px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${d.clientAddress||"No address"}</p>
          <div style="display:flex;justify-content:space-between;align-items:center;padding-top:12px;border-top:1px solid var(--gray-100);">
            <div style="font-size:20px;font-weight:700;color:#C4705A;">${d.grandTotal||"₹0"}</div>
            <div style="display:flex;gap:8px;">
              <button onclick="event.stopPropagation();window.MayaModals.clients.loadClient('${l}')" style="background:var(--primary);color:white;border:none;padding:8px 16px;border-radius:6px;font-size:12px;font-weight:500;cursor:pointer;">Load</button>
              <button onclick="event.stopPropagation();window.MayaModals.clients.deleteClient('${l}')" style="background:white;color:#ef4444;border:1px solid #ef4444;padding:8px 12px;border-radius:6px;font-size:12px;cursor:pointer;">
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </button>
            </div>
          </div>
          <div style="font-size:10px;color:var(--gray-400);margin-top:8px;">Saved: ${h}</div>
        </div>
      `}),a&&(a.innerHTML=r)}filterClients(){var o;const t=(((o=this.$("#clientSearchInput"))==null?void 0:o.value)||"").toLowerCase();this.$$(".client-card-item").forEach(a=>{const s=a.textContent.toLowerCase();a.style.display=s.includes(t)?"block":"none"})}loadClient(t){w.loadClient(t),this.close(),u("Loaded: "+t,!0),this.onLoadCallback&&this.onLoadCallback()}deleteClient(t){if(!confirm(`Delete quotation ${t}?`))return;const e=w.getClients();delete e[t],localStorage.setItem("mayaClients",JSON.stringify(e)),this.renderClients(),u("Deleted: "+t,!0)}}class dt extends M{constructor(){super("validationModal",{maxWidth:"500px"}),this.issues=[],this.pendingAction=null,this.onGoToRow=null}title(){return"Incomplete Items Found"}body(){return`
      <div style="margin-bottom:16px;">
        <p style="color:var(--gray-600);font-size:14px;">The following items have missing values. You can fix them or proceed anyway.</p>
      </div>
      <div id="validationIssuesList" style="display:flex;flex-direction:column;gap:10px;max-height:300px;overflow-y:auto;"></div>
    `}footer(){return`
      <button class="modal-btn cancel" data-action="close">Cancel</button>
      <button class="modal-btn primary" id="proceedAnywayBtn">Proceed Anyway</button>
    `}afterOpen(){this.renderIssues();const t=this.$("#proceedAnywayBtn");t&&(t.onclick=()=>this.proceed())}show(t,e,o=null){this.issues=t,this.pendingAction=e,this.onGoToRow=o,this.open()}renderIssues(){const t=this.$("#validationIssuesList");if(!t)return;let e="";this.issues.forEach(o=>{e+=`
        <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:12px;display:flex;align-items:center;gap:12px;">
          <div style="background:#ef4444;color:white;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:12px;flex-shrink:0;">${o.rowNum}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-weight:600;color:#991b1b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${o.description||"Unnamed item"}</div>
            <div style="font-size:12px;color:#dc2626;">${o.problems.join(", ")}</div>
          </div>
          <button onclick="window.MayaModals.validation.goToRow(${o.rowNum})" style="background:#ef4444;color:white;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:11px;white-space:nowrap;">Go to</button>
        </div>
      `}),t.innerHTML=e}goToRow(t){this.close(),this.onGoToRow&&this.onGoToRow(t)}proceed(){this.close(),this.pendingAction&&this.pendingAction()}beforeClose(){document.querySelectorAll(".item-row.incomplete").forEach(t=>{t.classList.remove("incomplete")})}}class ct extends M{constructor(){super("bankModal",{maxWidth:"500px"})}title(){return"Bank Accounts"}body(){const e=n.get("settings").qrCodeImage||"";return`
      <!-- Existing Accounts -->
      <div style="margin-bottom:20px;">
        <h4 style="margin:0 0 12px;font-size:14px;">Saved Accounts</h4>
        <div id="bankAccountsList" style="display:flex;flex-direction:column;gap:8px;max-height:200px;overflow-y:auto;"></div>
      </div>

      <!-- QR Code Upload -->
      <div style="margin-bottom:20px;padding:16px;background:var(--gray-50);border-radius:8px;">
        <h4 style="margin:0 0 12px;font-size:14px;">Payment QR Code</h4>
        <div style="display:flex;align-items:center;gap:16px;">
          <div id="qrCodePreview" style="width:100px;height:100px;border:2px dashed var(--gray-300);border-radius:8px;display:flex;align-items:center;justify-content:center;overflow:hidden;cursor:pointer;position:relative;" onclick="document.getElementById('qrCodeInput').click()">
            ${e?`<img src="${e}" style="width:100%;height:100%;object-fit:contain;">`:`
              <div style="text-align:center;color:var(--gray-400);font-size:11px;">
                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="margin:0 auto 4px;display:block;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                Click to upload
              </div>
            `}
            <input type="file" id="qrCodeInput" accept="image/*" style="display:none;">
          </div>
          <div style="flex:1;">
            <p style="font-size:12px;color:var(--gray-600);margin:0 0 8px;">Upload a QR code for easy payments. This will appear on PDF quotations.</p>
            ${e?'<button id="removeQrBtn" style="background:#fee2e2;color:#dc2626;border:none;padding:6px 12px;border-radius:6px;font-size:12px;cursor:pointer;">Remove QR</button>':""}
          </div>
        </div>
      </div>

      <!-- Add New Account -->
      <div style="padding-top:20px;border-top:1px solid var(--gray-200);">
        <h4 style="margin:0 0 12px;font-size:14px;">Add New Account</h4>
        <div style="display:flex;flex-direction:column;gap:12px;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div>
              <label style="font-size:11px;color:var(--gray-500);display:block;margin-bottom:4px;">Account Name</label>
              <input type="text" id="newBankName" placeholder="e.g., HDFC - Maya" style="width:100%;padding:8px;border:1px solid var(--gray-200);border-radius:6px;">
            </div>
            <div>
              <label style="font-size:11px;color:var(--gray-500);display:block;margin-bottom:4px;">Bank Name</label>
              <input type="text" id="newBankBank" placeholder="e.g., HDFC Bank" style="width:100%;padding:8px;border:1px solid var(--gray-200);border-radius:6px;">
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div>
              <label style="font-size:11px;color:var(--gray-500);display:block;margin-bottom:4px;">Account Number</label>
              <input type="text" id="newAccNo" placeholder="e.g., 1234567890" style="width:100%;padding:8px;border:1px solid var(--gray-200);border-radius:6px;">
            </div>
            <div>
              <label style="font-size:11px;color:var(--gray-500);display:block;margin-bottom:4px;">IFSC Code</label>
              <input type="text" id="newIfsc" placeholder="e.g., HDFC0001234" style="width:100%;padding:8px;border:1px solid var(--gray-200);border-radius:6px;">
            </div>
          </div>
          <div>
            <label style="font-size:11px;color:var(--gray-500);display:block;margin-bottom:4px;">UPI ID</label>
            <input type="text" id="newUpi" placeholder="e.g., mayainteriors@upi" style="width:100%;padding:8px;border:1px solid var(--gray-200);border-radius:6px;">
          </div>
        </div>
      </div>
    `}footer(){return`
      <button class="modal-btn cancel" data-action="close">Cancel</button>
      <button class="modal-btn primary" id="saveBankBtn">Save Account</button>
    `}afterOpen(){this.renderList();const t=this.$("#saveBankBtn");t&&(t.onclick=()=>this.saveAccount());const e=this.$("#qrCodeInput");e&&(e.onchange=a=>this.uploadQR(a));const o=this.$("#removeQrBtn");o&&(o.onclick=()=>this.removeQR())}uploadQR(t){var a;const e=(a=t.target.files)==null?void 0:a[0];if(!e)return;const o=new FileReader;o.onload=s=>{const r=s.target.result;n.set("settings.qrCodeImage",r);const l=this.$("#qrCodePreview");l&&(l.innerHTML=`<img src="${r}" style="width:100%;height:100%;object-fit:contain;">`),u("QR code uploaded!",!0),this.rerender()},o.readAsDataURL(e)}removeQR(){n.set("settings.qrCodeImage",""),u("QR code removed",!0),this.rerender()}rerender(){const t=this.$(".modal-body");t&&(t.innerHTML=this.body(),this.afterOpen())}renderList(){const t=n.get("settings"),e=t.bankAccounts||[],o=t.selectedBank||0;let a="";e.forEach((r,l)=>{const d=l===o;a+=`
        <div style="display:flex;align-items:center;gap:10px;padding:12px;background:${d?"#e0e7ff":"#f9fafb"};border:1px solid ${d?"var(--primary)":"var(--gray-200)"};border-radius:8px;">
          <input type="radio" name="selectedBank" ${d?"checked":""} onclick="window.MayaModals.bank.selectBank(${l})" style="cursor:pointer;">
          <div style="flex:1;">
            <div style="font-weight:600;color:var(--gray-800);">${r.name||r.bank}</div>
            <div style="font-size:12px;color:var(--gray-500);">A/C: ${r.accNo||"-"} | IFSC: ${r.ifsc||"-"}</div>
          </div>
          <button onclick="window.MayaModals.bank.deleteAccount(${l})" style="background:transparent;color:#ef4444;border:none;padding:4px;cursor:pointer;">
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>
      `});const s=this.$("#bankAccountsList");s&&(s.innerHTML=a||'<div style="color:var(--gray-500);font-size:13px;text-align:center;padding:20px;">No bank accounts added.</div>')}selectBank(t){n.set("settings.selectedBank",t),this.renderList(),u("Bank account selected",!0)}saveAccount(){var l,d,p,h,g;const t=(l=this.$("#newBankName"))==null?void 0:l.value.trim(),e=(d=this.$("#newBankBank"))==null?void 0:d.value.trim(),o=(p=this.$("#newAccNo"))==null?void 0:p.value.trim(),a=(h=this.$("#newIfsc"))==null?void 0:h.value.trim(),s=(g=this.$("#newUpi"))==null?void 0:g.value.trim();if(!e||!o){u("Bank name and account number required",!1);return}const r=n.get("settings");r.bankAccounts||(r.bankAccounts=[]),r.bankAccounts.push({name:t||e,bank:e,accNo:o,ifsc:a,upi:s}),n.set("settings",r),["#newBankName","#newBankBank","#newAccNo","#newIfsc","#newUpi"].forEach(b=>{const x=this.$(b);x&&(x.value="")}),this.renderList(),u("Bank account added!",!0)}deleteAccount(t){if(!confirm("Delete this bank account?"))return;const e=n.get("settings");e.bankAccounts.splice(t,1),e.selectedBank>=e.bankAccounts.length&&(e.selectedBank=Math.max(0,e.bankAccounts.length-1)),n.set("settings",e),this.renderList(),u("Bank account deleted",!0)}}class pt extends M{constructor(){super("receiptModal",{maxWidth:"520px"}),this.selectedStage=""}title(){return"Payment Receipt"}body(){const t=n.get("client"),e=y.calculateGrandTotal();return`
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
        <div>
          <label style="font-size:11px;color:var(--gray-500);display:block;margin-bottom:4px;">Receipt No</label>
          <input type="text" id="receiptNo" value="RCP-001" style="width:100%;padding:8px;border:1px solid var(--gray-200);border-radius:6px;">
        </div>
        <div>
          <label style="font-size:11px;color:var(--gray-500);display:block;margin-bottom:4px;">Date</label>
          <input type="date" id="receiptDate" value="${P()}" style="width:100%;padding:8px;border:1px solid var(--gray-200);border-radius:6px;">
        </div>
      </div>

      <div style="margin-bottom:16px;">
        <label style="font-size:11px;color:var(--gray-500);display:block;margin-bottom:4px;">Received From</label>
        <input type="text" id="receivedFrom" value="${t.name||""}" placeholder="Client Name" style="width:100%;padding:8px;border:1px solid var(--gray-200);border-radius:6px;">
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
        <div>
          <label style="font-size:11px;color:var(--gray-500);display:block;margin-bottom:4px;">Amount (₹)</label>
          <input type="number" id="receiptAmount" placeholder="Enter amount" oninput="window.MayaModals.receipt.updateSummary()" style="width:100%;padding:8px;border:1px solid var(--gray-200);border-radius:6px;">
        </div>
        <div>
          <label style="font-size:11px;color:var(--gray-500);display:block;margin-bottom:4px;">Payment Mode</label>
          <select id="paymentMode" style="width:100%;padding:8px;border:1px solid var(--gray-200);border-radius:6px;">
            <option value="Cash">Cash</option>
            <option value="UPI">UPI</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Cheque">Cheque</option>
          </select>
        </div>
      </div>

      <div style="margin-bottom:16px;">
        <label style="font-size:11px;color:var(--gray-500);display:block;margin-bottom:8px;">Payment For</label>
        <div id="paymentStages" style="display:flex;gap:8px;flex-wrap:wrap;">
          <div class="payment-option" onclick="window.MayaModals.receipt.selectStage(this, 'Booking 5%')" style="padding:8px 16px;border:2px solid var(--gray-200);border-radius:8px;cursor:pointer;font-size:13px;font-weight:500;transition:all 0.2s;">Booking 5%</div>
          <div class="payment-option" onclick="window.MayaModals.receipt.selectStage(this, 'Production 45%')" style="padding:8px 16px;border:2px solid var(--gray-200);border-radius:8px;cursor:pointer;font-size:13px;font-weight:500;transition:all 0.2s;">Production 45%</div>
          <div class="payment-option" onclick="window.MayaModals.receipt.selectStage(this, 'Factory 45%')" style="padding:8px 16px;border:2px solid var(--gray-200);border-radius:8px;cursor:pointer;font-size:13px;font-weight:500;transition:all 0.2s;">Factory 45%</div>
          <div class="payment-option" onclick="window.MayaModals.receipt.selectStage(this, 'Handover 5%')" style="padding:8px 16px;border:2px solid var(--gray-200);border-radius:8px;cursor:pointer;font-size:13px;font-weight:500;transition:all 0.2s;">Handover 5%</div>
        </div>
      </div>

      <div style="background:var(--gray-50);border-radius:8px;padding:16px;">
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--gray-200);">
          <span style="color:var(--gray-500);">Quotation Total</span>
          <span id="rcptTotal" style="font-weight:600;">₹${c(e.grandTotal)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--gray-200);">
          <span style="color:var(--gray-500);">Previously Paid</span>
          <span id="rcptPaid" style="font-weight:600;">₹0</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--gray-200);">
          <span style="color:var(--gray-500);">Current Payment</span>
          <span id="rcptCurrent" style="font-weight:600;color:var(--success);">₹0</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:12px 0;margin-top:8px;border-top:2px solid var(--gray-300);">
          <span style="font-weight:700;">Balance Due</span>
          <span id="rcptBalance" style="font-weight:700;color:#C4705A;font-size:16px;">₹${c(e.grandTotal)}</span>
        </div>
      </div>
    `}footer(){return`
      <button class="modal-btn cancel" data-action="close">Cancel</button>
      <button class="modal-btn primary" id="saveReceiptBtn">Save Receipt</button>
    `}afterOpen(){if(this.preSelectedStage){const e=`${this.preSelectedStage} ${this.preSelectedPercent}%`;this.$$(".payment-option").forEach(a=>{a.textContent.includes(this.preSelectedStage)&&this.selectStage(a,e)}),this.preSelectedStage=null,this.preSelectedPercent=null}else this.selectedStage="";this.updateSummary();const t=this.$("#saveReceiptBtn");t&&(t.onclick=()=>this.saveReceipt())}setStage(t,e){this.preSelectedStage=t,this.preSelectedPercent=e}selectStage(t,e){this.$$(".payment-option").forEach(o=>{o.style.borderColor="var(--gray-200)",o.style.background="transparent",o.style.color="var(--gray-700)"}),t.style.borderColor="var(--primary)",t.style.background="var(--primary-light)",t.style.color="var(--primary)",this.selectedStage=e}updateSummary(){var h;const t=y.calculateGrandTotal(),o=n.get("settings").paidAmount||0,a=parseFloat((h=this.$("#receiptAmount"))==null?void 0:h.value)||0,s=t.grandTotal-o-a,r=this.$("#rcptTotal"),l=this.$("#rcptPaid"),d=this.$("#rcptCurrent"),p=this.$("#rcptBalance");r&&(r.textContent="₹"+c(t.grandTotal)),l&&(l.textContent="₹"+c(o)),d&&(d.textContent="₹"+c(a)),p&&(p.textContent="₹"+c(Math.max(0,s)))}saveReceipt(){var p,h,g,b,x;const t=((p=this.$("#receiptNo"))==null?void 0:p.value)||"RCP-001",e=(h=this.$("#receiptDate"))==null?void 0:h.value,o=(g=this.$("#receivedFrom"))==null?void 0:g.value,a=parseFloat((b=this.$("#receiptAmount"))==null?void 0:b.value)||0,s=(x=this.$("#paymentMode"))==null?void 0:x.value;if(!a){u("Please enter amount",!1);return}const r=n.get("settings");r.paidAmount=(r.paidAmount||0)+a,n.set("settings",r);const l={receiptNo:t,date:e,receivedFrom:o,amount:a,mode:s,stage:this.selectedStage,timestamp:new Date().toISOString()};let d=JSON.parse(localStorage.getItem("mayaReceipts")||"[]");d.push(l),localStorage.setItem("mayaReceipts",JSON.stringify(d)),u(`Receipt saved: ₹${c(a)}`,!0),this.close()}}document.addEventListener("DOMContentLoaded",()=>{console.log("Maya Interiors - Initializing..."),w.loadAll(),y.recalculateAll(),new st("#app").render();const t=new nt,e=new rt,o=new lt,a=new dt,s=new ct,r=new pt,l=document.createElement("div");l.id="modals-container",l.innerHTML=[t.render(),e.render(),o.render(),a.render(),s.render(),r.render()].join(""),document.body.appendChild(l),window.MayaModals={shortcutManager:t,itemManager:e,clients:o,validation:a,bank:s,receipt:r},n.get("quotation.date")||n.set("quotation.date",new Date().toISOString().split("T")[0]);let d=null;n.subscribe("*",()=>{clearTimeout(d),d=setTimeout(()=>{w.saveAll()},1e3)}),window.addEventListener("beforeunload",()=>{clearTimeout(d),w.saveAll()}),console.log("Maya Interiors - Ready!")});window.MayaApp={store:n,StorageService:w,CalculationService:y,PDFService:j,ValidationService:_,modals:()=>window.MayaModals};
