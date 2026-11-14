(function () {
    'use strict';
    const root = document.querySelector('[data-chat-widget]');
    if (!root || root.dataset.ready) return;
    root.dataset.ready = '1';
    const find = s => root.querySelector(s), dialog = find('dialog'), launcher = find('.rd-chat-launch');
    const error = find('[data-chat-error]'), start = find('[data-chat-start]'), compose = find('[data-chat-compose]');
    const log = find('[data-chat-messages]'), status = find('[data-chat-status]'), latest = find('[data-chat-latest]');
    const welcome = find('[data-chat-welcome]'), teaser = find('[data-chat-teaser]');
    let csrf = '', chat = null, polling = false, answering = false, sending = false, startingNew = false, begun = false, dismissed = false, failures = 0, connectionError = false, messageId = null, lastBody = '', displayed = new Set(), timer;
    let stateRevision = 0, typingExpiry;
    const typing = window.RedDotChatTyping?.({input:compose.querySelector('textarea'),
        canType:()=>!!chat && chat.status !== 'closed' && dialog.open && !sending && !chat.needs_bot,
        identity:()=>chat?.reference,
        send:(value,reference)=>request('/typing',{typing:value},true,reference)});
    try { dismissed = sessionStorage.getItem('rd-chat-invitation-dismissed') === '1'; } catch (_) {}
    function screens() {
        welcome.hidden = !!chat || begun;
        start.hidden = !!chat || !begun;
        find('[data-chat-conversation]').hidden = !chat;
        find('[data-chat-back]').hidden = !!chat || !begun;
        teaser.hidden = dismissed;
        launcher.hidden = !dismissed;
    }
    function schedulePoll() {
        clearTimeout(timer);
        timer = setTimeout(poll, failures ? Math.min(60000, 5000 * Math.pow(2, Math.min(failures - 1, 4))) : dialog.open ? (chat && chat.status !== 'closed' ? 1000 : 3000) : 60000);
    }
    function fail(message, connection = false) { error.textContent = message; error.hidden = false; connectionError = connection; }
    function fieldError(field, message) {
        const target = start.querySelector('[data-chat-field-error="' + field.name + '"]');
        if (!target) return;
        target.textContent = message; target.hidden = !message;
        if (message) field.setAttribute('aria-invalid', 'true'); else field.removeAttribute('aria-invalid');
    }
    function validateTelephone() {
        const field = start.elements.namedItem('telephone');
        const number = field.value.trim().replace(/[ ().-]/g, '');
        field.setCustomValidity(number && !/^\+[1-9][0-9]{6,14}$/.test(number) ? 'Enter a telephone number with a + country code and 7–15 digits, for example +44 7700 900123.' : '');
    }
    start.addEventListener('invalid', e => fieldError(e.target, e.target.validationMessage), true);
    start.addEventListener('input', e => {
        if (e.target.name === 'telephone') validateTelephone();
        if (e.target.name) fieldError(e.target, '');
    });
    async function request(path, body, retry = true, reference = chat?.reference) {
        const response = await fetch(root.dataset.base + path, {method: body === undefined ? 'GET' : 'POST', credentials:'same-origin', cache:'no-store', signal:AbortSignal.timeout(35000), headers:{Accept:'application/json', ...(body === undefined ? {} : {'Content-Type':'application/json','X-CSRF-TOKEN':csrf, ...(path === '/start' ? {} : {'X-Chat-Conversation':reference || ''})})}, ...(body === undefined ? {} : {body:JSON.stringify(body)})});
        const data = await response.json().catch(() => ({}));
        if (response.status === 419 && body !== undefined && retry) {
            const state = await request('/state');
            // Never replay a message/end action into a different or missing visitor session.
            if (!state.enabled || !state.csrf_token || (path !== '/start' && (!reference || state.conversation?.reference !== reference))) {
                throw new Error('Your chat session has expired. Please refresh the page to reconnect. Your unsent message has not been sent.');
            }
            csrf = state.csrf_token;
            return request(path, body, false, reference);
        }
        if (!response.ok) {
            const failure = new Error(Object.values(data.errors || {}).flat().join(' ') || data.message || 'Chat is unavailable. Please try again.');
            failure.fields = data.errors || {}; throw failure;
        }
        return data;
    }
    async function update(path, body) {
        const revision = ++stateRevision;
        try {
            const data = await request(path, body);
            if (revision === stateRevision) render(data);
        } finally {
            // Invalidate polls started before or during this action, even if it failed.
            if (revision === stateRevision) stateRevision++;
        }
    }
    function render(data) {
        if (!data.enabled) { root.hidden = true; if (dialog.open) dialog.close(); return; }
        root.hidden = false; if (data.csrf_token) csrf = data.csrf_token;
        const live = data.conversation?.status === 'live' || (!data.conversation && data.consultant_available);
        for (const label of root.querySelectorAll('[data-chat-agent-label]')) label.textContent = live ? 'Travel Consultant' : 'Travel Assistant';
        find('[data-chat-agent-status]').textContent = live ? 'Red Dot travel team' : data.bot_enabled === false ? 'Leave an enquiry for our team' : 'Red Dot automated assistant';
        find('[data-chat-availability]').textContent = data.consultant_available ? 'Consultants available · Daily, 12pm–9pm Sri Lanka time' : 'Consultants: daily, 12pm–9pm Sri Lanka time';
        find('[data-chat-invitation]').textContent = data.consultant_available ? 'Chat to one of our experts now' : 'Have a question? Let’s talk travel';
        find('[data-chat-welcome-message]').textContent = data.consultant_available ? 'Hello, welcome to Red Dot. Chat to one of our experts about your next trip.' : 'Hello, welcome to Red Dot. How can we help with your travel plans?';
        find('[data-chat-welcome-note]').textContent = data.consultant_available ? 'Tell us what you have in mind. A travel consultant will join when available.' : data.bot_enabled === false ? 'Leave a message and our travel team can follow up by email.' : 'Ask a question or tell us about your trip. Our automated assistant can help while the team is away.';
        if (data.conversation && data.conversation.status !== 'closed') startingNew = false;
        const next = startingNew && data.conversation?.status === 'closed' ? null : data.conversation;
        if (chat?.reference !== next?.reference) { typing?.stop(); log.replaceChildren(); displayed.clear(); latest.hidden = true; }
        chat = next;
        screens();
        if (!chat) return;
        const nearBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 80;
        let added = false;
        for (const message of chat.messages) {
            if (displayed.has(message.id)) continue;
            const item = document.createElement('div'); item.className = 'rd-chat-message'; item.dataset.kind = message.kind;
            const label = document.createElement('strong'); label.textContent = message.sender_name;
            const body = document.createElement('p'); body.textContent = message.body; item.append(label, body);
            for (const citation of message.citations || []) {
                try { const url = new URL(citation.url); if (url.protocol !== 'https:' || !['www.reddottours.com','reddottours.com'].includes(url.hostname)) continue;
                    const a = document.createElement('a'); a.href = url.href; a.textContent = citation.title; a.target='_blank'; a.rel='noopener noreferrer'; item.append(a);
                } catch (_) {}
            }
            const time = document.createElement('time'); time.dateTime = message.created_at; time.textContent = new Date(message.created_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}); item.append(time);
            log.append(item); displayed.add(message.id); added = true;
        }
        if (nearBottom) { log.scrollTop = log.scrollHeight; latest.hidden = true; }
        else if (added) latest.hidden = false;
        const closed = chat.status === 'closed';
        compose.hidden = closed; find('[data-chat-end]').hidden = closed; find('[data-chat-consultant]').hidden = closed || chat.status === 'live'; find('[data-chat-new]').hidden = !closed;
        compose.querySelector('button').disabled = sending || chat.needs_bot;
        showStatus();
        clearTimeout(typingExpiry);
        if (chat.typing) { const reference=chat.reference; typingExpiry=setTimeout(()=>{if(chat?.reference===reference){chat.typing=false;showStatus();}}, Math.min(5000,Number(chat.typing_expires_ms)||5000)); }
        if (chat.needs_bot && !answering && dialog.open) answer();
    }
    function showStatus() {
        if (!chat) return;
        const text=chat.status==='closed'?'Chat ended. Your conversation has been saved.':chat.typing?'Your consultant is typing…':chat.needs_bot?'The automated assistant is replying…':chat.status==='waiting'?'Waiting for a consultant…':chat.status==='live'?'You are speaking with a Red Dot consultant.':'Automated assistant · A consultant can follow up by email.';
        if(status.textContent!==text)status.textContent=text;
    }
    async function poll() {
        if (polling) return;
        if (document.hidden) { schedulePoll(); return; }
        polling = true;
        const revision = stateRevision;
        const path=chat ? '/state?reference='+encodeURIComponent(chat.reference)+'&after='+Math.max(0,...displayed) : '/state';
        try { const data=await request(path); if(revision===stateRevision)render(data); failures=0; if (connectionError) { error.hidden=true; connectionError=false; } } catch (e) { if(revision===stateRevision){failures++; if (dialog.open) fail(e.message, true);} }
        finally { polling = false; schedulePoll(); }
    }
    async function answer() {
        answering = true;
        try { await update('/respond', {}); } catch (e) { fail(e.message); }
        finally { answering = false; }
    }
    function hide() { typing?.stop(); dialog.close(); schedulePoll(); (dismissed ? launcher : find('.rd-chat-invitation')).focus(); }
    for (const button of root.querySelectorAll('[data-chat-open]')) button.addEventListener('click', () => { screens(); dialog.showModal(); poll(); schedulePoll(); });
    find('[data-chat-dismiss]').addEventListener('click', () => {
        dismissed=true; try { sessionStorage.setItem('rd-chat-invitation-dismissed','1'); } catch (_) {}
        screens(); launcher.focus();
    });
    find('[data-chat-begin]').addEventListener('click', () => { begun=true; screens(); start.querySelector('input').focus(); });
    find('[data-chat-back]').addEventListener('click', () => { begun=false; screens(); find('[data-chat-begin]').focus(); });
    find('[data-chat-hide]').addEventListener('click', hide);
    latest.addEventListener('click', () => { log.scrollTop = log.scrollHeight; latest.hidden = true; log.focus(); });
    log.addEventListener('scroll', () => { if (log.scrollHeight - log.scrollTop - log.clientHeight < 80) latest.hidden = true; }, {passive:true});
    dialog.addEventListener('cancel', e => { e.preventDefault(); hide(); });
    dialog.addEventListener('keydown', e => {
        if (e.key !== 'Tab') return;
        const controls = [...dialog.querySelectorAll('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]')].filter(el => el.getClientRects().length);
        const first = controls[0], last = controls[controls.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    });
    start.addEventListener('submit', async e => {
        e.preventDefault(); if (sending) return;
        validateTelephone(); if (!start.reportValidity()) return;
        for (const field of start.querySelectorAll('input')) fieldError(field, '');
        sending=true; error.hidden=true; connectionError=false; const button=start.querySelector('button'); button.disabled=true;
        try { await update('/start', Object.fromEntries(new FormData(start))); schedulePoll(); compose.querySelector('textarea').focus(); }
        catch(e) {
            fail(e.message); let first;
            for (const name of ['name','email','telephone','country','consent']) {
                if (e.fields?.[name]) { const field = start.elements.namedItem(name); fieldError(field, [].concat(e.fields[name]).join(' ')); first ||= field; }
            }
            first?.focus();
        } finally { sending=false; button.disabled=false; compose.querySelector('button').disabled=!!chat?.needs_bot; }
    });
    compose.addEventListener('submit', async e => {
        e.preventDefault(); if (sending || chat?.needs_bot) return;
        const input=compose.querySelector('textarea'), draft=input.value, body=draft.trim(); if (!body) return;
        if (!messageId || body !== lastBody) { messageId=crypto.randomUUID(); lastBody=body; }
        typing?.stop(); sending=true; error.hidden=true; const button=compose.querySelector('button'); button.disabled=true; button.textContent='Sending…'; compose.setAttribute('aria-busy','true');
        try { await update('/messages',{message:body,client_id:messageId}); if(input.value===draft)input.value=''; messageId=null; }
        catch(e) { fail(e.message); } finally { sending=false; button.disabled=!!chat?.needs_bot; button.textContent='Send'; compose.removeAttribute('aria-busy'); schedulePoll(); input.focus(); }
    });
    find('[data-chat-consultant]').addEventListener('click', async e => {
        e.currentTarget.disabled=true; error.hidden=true;
        try { await update('/consultant',{}); } catch(e) { fail(e.message); } finally { find('[data-chat-consultant]').disabled=false; }
    });
    find('[data-chat-end]').addEventListener('click', async () => {
        if (!window.confirm('End this conversation? You can start another chat later.')) return;
        try { await update('/close',{}); } catch(e) { fail(e.message); }
    });
    find('[data-chat-new]').addEventListener('click', () => { stateRevision++; startingNew=true; begun=true; chat=null; screens(); start.querySelector('input').focus(); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden && (dialog.open || root.hidden)) poll(); });
    screens(); poll();
})();
