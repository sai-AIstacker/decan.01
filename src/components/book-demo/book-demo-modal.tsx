"use client";

import { useState, useEffect } from "react";
import { X, ChevronRight, ChevronLeft, Loader2, CheckCircle2, Phone, Clock, Check } from "lucide-react";

const SLOTS = ["10:00","11:00","12:00","14:00","15:00","16:00"];
const SLOT_LABELS: Record<string,string> = {
  "10:00":"10:00 AM","11:00":"11:00 AM","12:00":"12:00 PM",
  "14:00":"2:00 PM","15:00":"3:00 PM","16:00":"4:00 PM",
};
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS_SHORT = ["Su","Mo","Tu","We","Th","Fr","Sa"];

type Step = 1|2|3;
interface Form { name:string; email:string; school:string; role:string; size:string; date:string; time:string; }

function toDateStr(y:number,m:number,d:number){ return `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`; }
function isDayDisabled(y:number,m:number,d:number){
  const today=new Date(); today.setHours(0,0,0,0);
  const dt=new Date(y,m,d);
  return dt<today||dt.getDay()===0||dt.getDay()===6;
}

function StepBar({step}:{step:Step}){
  const items=[{n:1 as Step,l:"Your info"},{n:2 as Step,l:"About you"},{n:3 as Step,l:"Schedule"}];
  return (
    <div className="flex items-start mb-6">
      {items.map((s,i)=>(
        <div key={s.n} className="flex items-start flex-1">
          <div className="flex flex-col items-center flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold border-2 transition-all ${
              s.n<step?"bg-[#1d1d1f] border-[#1d1d1f] text-white":
              s.n===step?"bg-white border-[#1d1d1f] text-[#1d1d1f]":
              "bg-white border-[#d2d2d7] text-[#aeaeb2]"}`}>
              {s.n<step?<Check size={12} strokeWidth={3}/>:s.n}
            </div>
            <span className={`mt-1 text-[10px] font-semibold whitespace-nowrap ${s.n===step?"text-[#1d1d1f]":s.n<step?"text-[#1d1d1f]":"text-[#aeaeb2]"}`}>{s.l}</span>
          </div>
          {i<2&&<div className="flex-1 h-px mt-4 mx-1 transition-all" style={{background:s.n<step?"#1d1d1f":"#e5e5ea"}}/>}
        </div>
      ))}
    </div>
  );
}

function Field({label,error,children}:{label:string;error?:string;children:React.ReactNode}){
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-bold tracking-[0.07em] uppercase text-[#6e6e73]">{label}</label>
      {children}
      {error&&<p className="text-[11px] text-[#ff3b30] font-medium pl-1">{error}</p>}
    </div>
  );
}

function TInput({value,onChange,placeholder,type="text",err}:{value:string;onChange:(v:string)=>void;placeholder:string;type?:string;err?:boolean}){
  return (
    <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      className={`w-full h-[52px] rounded-[14px] px-4 text-[15px] font-medium text-[#1d1d1f] placeholder:text-[#c7c7cc] outline-none transition-all border-2 bg-[#f9f9f9] ${
        err?"border-[#ff3b30] bg-[#fff5f5]":"border-transparent focus:border-[#1d1d1f] focus:bg-white focus:shadow-[0_0_0_4px_rgba(0,0,0,0.05)]"}`}/>
  );
}

function Pills({options,value,onChange}:{options:{v:string;l:string;sub?:string}[];value:string;onChange:(v:string)=>void}){
  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map(o=>(
        <button key={o.v} type="button" onClick={()=>onChange(o.v)}
          className={`relative h-[56px] rounded-[14px] text-[13px] font-semibold border-2 transition-all flex flex-col items-center justify-center gap-0.5 ${
            value===o.v?"bg-[#1d1d1f] border-[#1d1d1f] text-white shadow-[0_4px_12px_rgba(0,0,0,0.15)]":
            "bg-[#f9f9f9] border-transparent text-[#1d1d1f] hover:border-[#d2d2d7] hover:bg-white"}`}>
          <span>{o.l}</span>
          {o.sub&&<span className={`text-[10px] font-medium ${value===o.v?"text-white/60":"text-[#aeaeb2]"}`}>{o.sub}</span>}
          {value===o.v&&<div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-white/20 flex items-center justify-center"><Check size={9} strokeWidth={3} className="text-white"/></div>}
        </button>
      ))}
    </div>
  );
}

function MiniCal({selected,onSelect}:{selected:string;onSelect:(d:string)=>void}){
  const today=new Date();
  const [y,setY]=useState(today.getFullYear());
  const [m,setM]=useState(today.getMonth());
  const daysInMonth=new Date(y,m+1,0).getDate();
  const firstDay=new Date(y,m,1).getDay();
  const todayStr=toDateStr(today.getFullYear(),today.getMonth(),today.getDate());
  const prev=()=>m===0?(setM(11),setY(y-1)):setM(m-1);
  const next=()=>m===11?(setM(0),setY(y+1)):setM(m+1);
  return (
    <div className="bg-[#f9f9f9] rounded-[18px] p-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={prev} type="button" className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white transition-colors"><ChevronLeft size={15}/></button>
        <span className="text-[14px] font-bold text-[#1d1d1f]">{MONTHS[m]} {y}</span>
        <button onClick={next} type="button" className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white transition-colors"><ChevronRight size={15}/></button>
      </div>
      <div className="grid grid-cols-7 mb-2">
        {DAYS_SHORT.map(d=><div key={d} className="text-center text-[11px] font-bold text-[#aeaeb2] py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {Array.from({length:firstDay}).map((_,i)=><div key={`_${i}`}/>)}
        {Array.from({length:daysInMonth}).map((_,i)=>{
          const day=i+1;
          const ds=toDateStr(y,m,day);
          const dis=isDayDisabled(y,m,day);
          const sel=selected===ds;
          const isToday=ds===todayStr;
          return (
            <button key={day} type="button" disabled={dis} onClick={()=>!dis&&onSelect(ds)}
              className={`relative mx-auto w-9 h-9 rounded-full text-[13px] font-medium transition-all flex items-center justify-center ${
                sel?"bg-[#1d1d1f] text-white font-bold":
                dis?"text-[#c7c7cc] cursor-not-allowed":
                isToday?"text-[#007aff] font-bold hover:bg-white":
                "text-[#1d1d1f] hover:bg-white"}`}>
              {day}
              {isToday&&!sel&&<span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#007aff]"/>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function BookDemoModal({open,onClose}:{open:boolean;onClose:()=>void}){
  const [step,setStep]=useState<Step>(1);
  const [form,setForm]=useState<Form>({name:"",email:"",school:"",role:"",size:"",date:"",time:""});
  const [touched,setTouched]=useState<Partial<Record<keyof Form,boolean>>>({});
  const [bookedSlots,setBooked]=useState<string[]>([]);
  const [loadingSlots,setLS]=useState(false);
  const [submitting,setSub]=useState(false);
  const [apiError,setApiError]=useState("");
  const [success,setSuccess]=useState<{meetLink:string}|null>(null);
  const tz=Intl.DateTimeFormat().resolvedOptions().timeZone;

  const set=(k:keyof Form,v:string)=>{
    setForm(f=>({...f,[k]:v}));
    setTouched(t=>({...t,[k]:true}));
  };

  const errs={
    name:!form.name.trim()?"Name is required":"",
    email:!form.email.includes("@")?"Valid email required":"",
    school:!form.school.trim()?"School name is required":"",
  };
  const ok1=!errs.name&&!errs.email&&!errs.school;
  const ok2=!!form.role&&!!form.size;
  const ok3=!!form.date&&!!form.time;

  useEffect(()=>{
    if(!form.date)return;
    setLS(true);setBooked([]);
    fetch(`/api/book-demo/availability?date=${form.date}`)
      .then(r=>r.json()).then(d=>setBooked(d.booked||[])).catch(()=>{}).finally(()=>setLS(false));
  },[form.date]);

  useEffect(()=>{
    const h=(e:KeyboardEvent)=>e.key==="Escape"&&onClose();
    window.addEventListener("keydown",h);
    return ()=>window.removeEventListener("keydown",h);
  },[onClose]);

  useEffect(()=>{
    document.body.style.overflow=open?"hidden":"";
    return ()=>{document.body.style.overflow="";};
  },[open]);

  async function submit(){
    setSub(true);setApiError("");
    try{
      const res=await fetch("/api/book-demo",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form,timezone:tz})});
      const data=await res.json();
      if(!res.ok)throw new Error(data.error||"Booking failed");
      setSuccess({meetLink:data.meetLink});
    }catch(e:any){setApiError(e.message);}
    finally{setSub(false);}
  }

  function reset(){
    setStep(1);setForm({name:"",email:"",school:"",role:"",size:"",date:"",time:""});
    setTouched({});setApiError("");setSuccess(null);setBooked([]);
  }

  if(!open)return null;

  const dateLabel=form.date?new Date(form.date+"T12:00:00Z").toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",timeZone:"UTC"}):"";

  return (
    <>
      <div className="fixed inset-0 z-[99] bg-black/40 backdrop-blur-[8px]" onClick={onClose}/>

      <div className="fixed inset-x-0 bottom-0 sm:inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4">
        <div className="w-full sm:max-w-[460px] rounded-t-[28px] sm:rounded-[26px] flex flex-col"
          style={{height:"90dvh",maxHeight:"680px",background:"#ffffff",boxShadow:"0 -1px 0 rgba(0,0,0,0.06),0 40px 100px rgba(0,0,0,0.22)",animation:"sheet-in 0.4s cubic-bezier(0.32,0.72,0,1) forwards"}}>

          {/* Drag pill */}
          <div className="sm:hidden flex justify-center pt-3"><div className="w-10 h-1 rounded-full bg-[#e5e5ea]"/></div>

          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#f2f2f7] bg-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[12px] bg-[#1d1d1f] flex items-center justify-center">
                <Phone size={16} className="text-white"/>
              </div>
              <div>
                <p className="text-[16px] font-bold text-[#1d1d1f] leading-tight">Book a Demo</p>
                <p className="text-[12px] text-[#aeaeb2] font-medium">30 min · Free · Google Meet</p>
              </div>
            </div>
            <button onClick={onClose} type="button" className="w-8 h-8 rounded-full bg-[#f2f2f7] flex items-center justify-center hover:bg-[#e5e5ea] transition-colors">
              <X size={14} className="text-[#6e6e73]"/>
            </button>
          </div>

          {/* Body — scrollable */}
          <div className="flex-1 overflow-y-auto px-6 pt-5" style={{minHeight:0}}>
            {success?(
              <div className="py-4 text-center">
                <div className="w-20 h-20 rounded-full bg-[#f0fdf4] flex items-center justify-center mx-auto mb-5">
                  <CheckCircle2 size={40} className="text-[#34c759]" strokeWidth={1.5}/>
                </div>
                <h2 className="text-[24px] font-bold text-[#1d1d1f] mb-2 tracking-tight">You're booked! 🎉</h2>
                <p className="text-[14px] text-[#6e6e73] mb-6 leading-relaxed">
                  {dateLabel}<br/>
                  <span className="font-semibold text-[#1d1d1f]">{SLOT_LABELS[form.time]}</span> · {tz}
                </p>
                <div className="bg-[#f9f9f9] rounded-[18px] p-5 mb-6 text-left">
                  <p className="text-[13px] font-bold text-[#1d1d1f] mb-1">{dateLabel}</p>
                  <p className="text-[12px] text-[#aeaeb2] mb-3">{SLOT_LABELS[form.time]} · 30 min</p>
                  <p className="text-[13px] text-[#6e6e73] leading-relaxed">
                    Confirmation email sent to <strong className="text-[#1d1d1f]">{form.email}</strong>
                  </p>
                </div>
                {success.meetLink&&(
                  <a href={success.meetLink} target="_blank" rel="noreferrer"
                    className="flex items-center justify-center gap-2 w-full h-[52px] rounded-full bg-[#1d1d1f] text-white text-[15px] font-semibold mb-4 hover:opacity-90 transition-opacity">
                    Join Google Meet <ChevronRight size={15}/>
                  </a>
                )}
                <button onClick={()=>{reset();onClose();}} type="button" className="text-[13px] text-[#aeaeb2] hover:text-[#6e6e73] transition-colors">Close</button>
              </div>
            ):(
              <>
                <StepBar step={step}/>

                {step===1&&(
                  <div className="space-y-4">
                    <div className="mb-5">
                      <h2 className="text-[22px] font-bold text-[#1d1d1f] tracking-tight">Tell us about you</h2>
                      <p className="text-[13px] text-[#aeaeb2] mt-1">We'll personalise the demo for your school.</p>
                    </div>
                    <Field label="Full name" error={touched.name?errs.name:""}>
                      <TInput value={form.name} onChange={v=>set("name",v)} placeholder="Alice Johnson" err={!!(touched.name&&errs.name)}/>
                    </Field>
                    <Field label="Work email" error={touched.email?errs.email:""}>
                      <TInput type="email" value={form.email} onChange={v=>set("email",v)} placeholder="alice@school.edu" err={!!(touched.email&&errs.email)}/>
                    </Field>
                    <Field label="School name" error={touched.school?errs.school:""}>
                      <TInput value={form.school} onChange={v=>set("school",v)} placeholder="Decan International School" err={!!(touched.school&&errs.school)}/>
                    </Field>
                  </div>
                )}

                {step===2&&(
                  <div className="space-y-5">
                    <div className="mb-5">
                      <h2 className="text-[22px] font-bold text-[#1d1d1f] tracking-tight">Quick questions</h2>
                      <p className="text-[13px] text-[#aeaeb2] mt-1">Helps us tailor the demo for you.</p>
                    </div>
                    <Field label="Your role">
                      <Pills options={[{v:"owner",l:"Owner",sub:"Decision maker"},{v:"admin",l:"Admin",sub:"School admin"},{v:"teacher",l:"Teacher",sub:"Educator"}]} value={form.role} onChange={v=>set("role",v)}/>
                    </Field>
                    <Field label="School size">
                      <Pills options={[{v:"0-100",l:"0–100",sub:"Small"},{v:"100-500",l:"100–500",sub:"Medium"},{v:"500+",l:"500+",sub:"Large"}]} value={form.size} onChange={v=>set("size",v)}/>
                    </Field>
                  </div>
                )}

                {step===3&&(
                  <div className="space-y-4">
                    <div className="mb-2">
                      <h2 className="text-[22px] font-bold text-[#1d1d1f] tracking-tight">Pick a time</h2>
                      <p className="text-[13px] text-[#aeaeb2] mt-1 flex items-center gap-1.5"><Clock size={11}/> 30 min · {tz}</p>
                    </div>
                    <MiniCal selected={form.date} onSelect={d=>{set("date",d);set("time","");}}/>
                    {form.date&&(
                      <div>
                        <p className="text-[11px] font-bold tracking-[0.07em] uppercase text-[#aeaeb2] mb-2.5">{dateLabel}</p>
                        {loadingSlots?(
                          <div className="flex items-center gap-2 text-[13px] text-[#aeaeb2] py-3"><Loader2 size={13} className="animate-spin"/> Checking availability…</div>
                        ):(
                          <div className="grid grid-cols-3 gap-2">
                            {SLOTS.map(slot=>{
                              const booked=bookedSlots.includes(slot);
                              const sel=form.time===slot;
                              return (
                                <button key={slot} type="button" disabled={booked} onClick={()=>!booked&&set("time",slot)}
                                  className={`h-[48px] rounded-[14px] text-[13px] font-semibold border-2 transition-all ${
                                    sel?"bg-[#1d1d1f] border-[#1d1d1f] text-white shadow-[0_4px_12px_rgba(0,0,0,0.15)]":
                                    booked?"bg-[#f9f9f9] border-transparent text-[#c7c7cc] cursor-not-allowed line-through":
                                    "bg-[#f9f9f9] border-transparent text-[#1d1d1f] hover:border-[#d2d2d7] hover:bg-white"}`}>
                                  {SLOT_LABELS[slot]}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                    {apiError&&<div className="rounded-[14px] bg-[#fff5f5] border border-[#ff3b30]/20 px-4 py-3 text-[13px] font-medium text-[#ff3b30]">{apiError}</div>}
                  </div>
                )}
              </>
            )}
          </div>{/* end scrollable body */}

          {/* ── FOOTER — black button, always pinned to bottom ── */}
          {!success&&(
            <div style={{flexShrink:0,padding:"16px 20px",background:"#ffffff",borderTop:"2px solid #f2f2f7"}}>
              <div style={{display:"flex",gap:"12px"}}>
                {step>1&&(
                  <button onClick={()=>setStep(s=>(s-1) as Step)} type="button"
                    style={{height:54,paddingLeft:24,paddingRight:24,borderRadius:999,border:"2px solid #e5e5ea",background:"#ffffff",fontSize:15,fontWeight:600,color:"#1d1d1f",display:"flex",alignItems:"center",gap:8,cursor:"pointer",flexShrink:0}}>
                    <ChevronLeft size={16}/> Back
                  </button>
                )}
                {step<3?(
                  <button type="button"
                    onClick={()=>{
                      if(step===1){setTouched({name:true,email:true,school:true});if(ok1)setStep(2);}
                      else{if(ok2)setStep(3);}
                    }}
                    style={{
                      flex:1,height:54,borderRadius:999,border:"none",
                      background:(step===1?ok1:ok2)?"#1d1d1f":"#c7c7cc",
                      color:"#ffffff",fontSize:15,fontWeight:700,
                      display:"flex",alignItems:"center",justifyContent:"center",gap:8,
                      cursor:(step===1?ok1:ok2)?"pointer":"not-allowed",
                    }}>
                    Continue <ChevronRight size={16}/>
                  </button>
                ):(
                  <button type="button" disabled={!ok3||submitting} onClick={submit}
                    style={{
                      flex:1,height:54,borderRadius:999,border:"none",
                      background:(!ok3||submitting)?"#c7c7cc":"#1d1d1f",
                      color:"#ffffff",fontSize:15,fontWeight:700,
                      display:"flex",alignItems:"center",justifyContent:"center",gap:8,
                      cursor:(!ok3||submitting)?"not-allowed":"pointer",
                    }}>
                    {submitting?<><Loader2 size={16} className="animate-spin"/> Booking…</>:"Confirm booking"}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes sheet-in{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </>
  );
}
