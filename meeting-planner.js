/* Meeting suggestions based on the same 30-day question data as doctor insights. */
window.MeetingPlanner = (() => {
  const paths = [
    ['audience', '先选医生', '按所选医生的共同关注点策划主题和议程'],
    ['topic', '先定主题', '按会议标签匹配医生并说明推荐原因'],
    ['hotspot', '从热点策划', '从医生洞察提取热点，同时生成议程和名单']
  ];
  const topics = [...new Set(QUESTION_BANK.map(q => q.topic))];
  const h = value => String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
  const agendaIdeas = {
    '用法用量': '说明书查阅与用药记录核对',
    '用药安全': '用药安全资料与风险信息查阅',
    '特殊人群': '特殊人群相关资料与证据边界',
    '指南证据': '指南出处与循证资料研读',
    '病历点评': '脱敏病例讨论与资料补充',
    '临床研究': '临床研究设计与终点解读'
  };
  const recent = () => EVENTS.filter(e => e.type === 'qa');
  function interest(doctorId) {
    const counts = new Map();
    for (const e of recent()) {
      if (e.doctor === doctorId) counts.set(e.question.topic, (counts.get(e.question.topic) || 0) + 1);
    }
    return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-CN'));
  }
  function hotspot(doctorIds) {
    const totals = new Map();
    for (const id of doctorIds) {
      for (const [tag, count] of interest(id)) {
        const row = totals.get(tag) || {tag, count: 0, doctors: 0};
        row.count += count;
        row.doctors++;
        totals.set(tag, row);
      }
    }
    return [...totals.values()].sort((a, b) => b.doctors - a.doctors || b.count - a.count).slice(0, 2);
  }
  function recommend(doctors, tags) {
    return doctors.map(doctor => {
      const matches = interest(doctor.id).filter(([topic]) => tags.includes(topic));
      return {doctor, matches, score: matches.reduce((sum, [, count]) => sum + count, 0)};
    }).filter(row => row.score).sort((a, b) => b.score - a.score || a.doctor.id.localeCompare(b.doctor.id, undefined, {numeric:true}));
  }
  const cnClock = new Intl.DateTimeFormat('en-GB', {timeZone:'Asia/Shanghai', hour:'2-digit', minute:'2-digit', hourCycle:'h23'});
  const cnDate = new Intl.DateTimeFormat('zh-CN', {timeZone:'Asia/Shanghai', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit', hourCycle:'h23'});
  function draft() {
    const day = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Shanghai', year:'numeric', month:'2-digit', day:'2-digit'}).format(new Date(Date.now() + 3 * 86400000));
    return {path:'audience', type:'online', location:'', start:day+'T14:00', end:day+'T16:00', deadline:day+'T12:00', capacity:30, doctorIds:[], tags:[], title:'', agendaText:'', intro:''};
  }
  function collect(form, prior) {
    const fields = new FormData(form);
    const result = {...prior};
    for (const key of ['path','type','location','start','end','deadline','capacity','title','agendaText','intro']) {
      if (fields.has(key)) result[key] = String(fields.get(key)).trim();
    }
    if (form.querySelector('[name=doctorIds]')) result.doctorIds = fields.getAll('doctorIds');
    if (form.querySelector('[name=tags]')) result.tags = fields.getAll('tags');
    return result;
  }
  function asDate(value) { return new Date(value + ':00+08:00'); }
  function basics(input) {
    const start = asDate(input.start), end = asDate(input.end), deadline = asDate(input.deadline);
    if (!(start.getTime() > Date.now() && end > start && deadline.getTime() > Date.now() && deadline <= start)) {
      throw Error('请确认开始时间在未来、结束晚于开始、报名截止不晚于开始。');
    }
    if (!input.location || !['online', 'offline'].includes(input.type)) throw Error('请填写会场地点或线上平台。');
    if (!Number.isInteger(Number(input.capacity)) || +input.capacity < 1 || +input.capacity > 500) throw Error('报名名额须为 1–500 的整数。');
    return {start, end, deadline};
  }
  function generate(input, doctors) {
    basics(input);
    if (input.path === 'topic') {
      if (!input.title || !input.agendaText || !input.tags.length) throw Error('请填写会议主题、议程并选择至少一个会议标签。');
      const rows = recommend(doctors, input.tags);
      return {...input, doctorIds:rows.slice(0, Math.min(6, +input.capacity)).map(row => row.doctor.id),
        reason:'根据会议标签与近30天提问的匹配次数排序，可调整邀请名单。'};
    }
    const audience = input.path === 'audience' ? input.doctorIds : doctors.map(d => d.id);
    if (!audience.length) throw Error('请至少选择一位医生。');
    const hot = hotspot(audience);
    if (!hot.length) throw Error('所选医生暂无可用于策划的关注标签。');
    const tags = hot.map(row => row.tag);
    const titles = ['开场与学术交流目标', ...tags.map(topic => agendaIdeas[topic]), '交流答疑与资料清单'];
    const rows = recommend(doctors, tags);
    return {...input, tags, title:'日达仙｜' + tags.join('与') + '交流会',
      intro:'围绕' + tags.join('与') + '交流资料查阅思路、证据来源及讨论问题。',
      agendaText:titles.join('\n'),
      doctorIds:input.path === 'audience' ? audience : rows.slice(0, Math.min(6, +input.capacity)).map(row => row.doctor.id),
      reason:hot.map(row => row.tag+'（'+row.doctors+' 位医生、'+row.count+' 次提问）').join('、')};
  }
  function meeting(input) {
    const {start, end, deadline} = basics(input);
    const rows = input.agendaText.split('\n').map(line => line.trim()).filter(Boolean);
    if (!input.title || !rows.length || rows.length > 12 || rows.some(row => row.length > 120)) {
      throw Error('请填写会议主题及 1–12 项议程，每项最多 120 字。');
    }
    if ((end-start)/60000 < rows.length) throw Error('会议时长不足以安排全部议程。');
    const agenda = rows.map((row, i) => [
      cnClock.format(new Date(start.getTime() + Math.floor((end-start)*i/rows.length/60000)*60000)), row
    ]);
    return {title:input.title, type:input.type, location:input.location, address:'', capacity:+input.capacity,
      start:start.toISOString(), end:end.toISOString(), deadline:deadline.toISOString(), tags:input.tags,
      intro:input.intro, agenda};
  }
  function invitation(m, doctor) {
    const interests = interest(doctor.id).map(([topic]) => topic);
    const matched = interests.filter(topic => m.tags?.includes(topic));
    const reason = matched.length
      ? '匹配的会议标签 '+matched.slice(0, 2).join('、')
      : interests.length ? '医生关注 '+interests.slice(0, 2).join('、') : '按会议时间与议程邀请';
    const focus = matched.length
      ? '其中的'+matched.slice(0, 2).join('、')+'环节与您关注的内容相关。'
      : interests.length ? '如您有'+interests[0]+'方面的问题，欢迎在交流环节提出。' : '欢迎围绕议程参与交流。';
    const date = cnDate.format(new Date(m.start));
    const mode = m.type === 'online' ? '线上' : '线下';
    return {reason, text:`${doctor.name}您好，诚邀您于${date}参加${mode}会议《${m.title}》（${m.location}）。${focus}如方便参加，请在${cnDate.format(new Date(m.deadline))}前打开邀请并完成报名。`};
  }
  const input = (label, name, value, extra='') => `<label for="mp-${name}">${label}</label><input id="mp-${name}" name="${name}" value="${h(value)}" ${extra}>`;
  function doctorChoices(doctors, ids, tags) {
    return doctors.map(d => {
      const ownTags = interest(d.id);
      const matched = ownTags.filter(([topic]) => tags.includes(topic));
      const detail = (matched.length ? matched : ownTags.slice(0, 2)).map(([topic, n]) => topic+' '+n+'次').join(' · ');
      return `<label class="mt-select-doctor"><input type="checkbox" name="doctorIds" value="${d.id}" ${ids.includes(d.id)?'checked':''}><span class="mt-select-copy"><strong>${h(d.name)} · ${h(d.department)}</strong><span>${h(detail || d.hospital)}</span></span></label>`;
    }).join('');
  }
  function markup(inputData, doctors, preview) {
    const d = inputData;
    const showTopic = preview || d.path === 'topic';
    const showDoctors = preview || d.path === 'audience';
    const matching = preview && d.path !== 'audience';
    const ranked = matching ? recommend(doctors, d.tags).map(row => row.doctor) : [];
    const rankedIds = new Set(ranked.map(doc => doc.id));
    const roster = matching ? [...ranked, ...doctors.filter(doc => !rankedIds.has(doc.id))] : doctors;
    return `<form id="mt-plan-form">
      <section class="mt-section mt-form">
        <h2>${preview?'确认会议策划':'生成会议'}</h2>
        ${preview?`<p class="mt-copy">${h(d.reason)}</p>`:`<fieldset class="mt-plan-paths"><legend>选择策划路径</legend>${paths.map(([value,title,description]) => `<label><input type="radio" name="path" value="${value}" ${value===d.path?'checked':''}><span><strong>${title}</strong><small>${description}</small></span></label>`).join('')}</fieldset>`}
        <label for="mp-type">会议形式</label>
        <select id="mp-type" name="type"><option value="online">线上会议</option><option value="offline" ${d.type==='offline'?'selected':''}>线下会议</option></select>
        ${input('会场地点或线上平台','location',d.location,'required maxlength="120" placeholder="例如：学术中心会议室 / 腾讯会议"')}
        ${input('开始时间（北京时间）','start',d.start,'type="datetime-local" required')}
        ${input('结束时间（北京时间）','end',d.end,'type="datetime-local" required')}
        ${input('报名截止（北京时间）','deadline',d.deadline,'type="datetime-local" required')}
        ${input('报名名额','capacity',d.capacity,'type="number" min="1" max="500" required')}
      </section>
      ${showTopic?`<section class="mt-section mt-form"><h3>主题与议程</h3>
        ${input('会议主题','title',d.title,'required maxlength="120"')}
        <label for="mp-agenda">议程（每行一项，按顺序安排）</label>
        <textarea id="mp-agenda" name="agendaText" required rows="5" maxlength="1400">${h(d.agendaText)}</textarea>
        <label for="mp-intro">会议介绍</label>
        <textarea id="mp-intro" name="intro" rows="3" maxlength="1000">${h(d.intro)}</textarea>
        <fieldset class="mt-plan-tags"><legend>会议标签</legend>${topics.map(t => `<label><input type="checkbox" name="tags" value="${h(t)}" ${d.tags.includes(t)?'checked':''}>${h(t)}</label>`).join('')}</fieldset>
      </section>`:''}
      ${showDoctors?`<section class="mt-section"><h3>${matching?'推荐邀请名单':'选择邀请医生'}</h3><div class="mt-select-list">${doctorChoices(roster,d.doctorIds,preview?d.tags:[])}</div></section>`:''}
      <p class="mt-field-error" id="mt-plan-error" role="alert" hidden></p>
      <div class="mt-actions">${preview?'<button type="button" class="mt-secondary" data-meeting-action="plan-back">返回策划</button>':''}
      <button type="submit" class="mt-primary">${preview?'确认会议并生成邀请话术':'生成会议策划'}</button></div>
    </form>`;
  }
  return {draft, collect, generate, meeting, markup, invitation, interest};
})();
