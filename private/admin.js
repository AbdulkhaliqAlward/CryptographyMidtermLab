'use strict';

(function () {
  var token = '';
  var data = [];
  var loginSec = document.getElementById('sec-login');
  var dashSec = document.getElementById('sec-dash');
  var loginForm = document.getElementById('login-form');
  var pwInput = document.getElementById('pw');
  var loginBtn = document.getElementById('login-btn');
  var loginAlert = document.getElementById('login-alert');
  var stTotal = document.getElementById('st-total');
  var stToday = document.getElementById('st-today');
  var searchInput = document.getElementById('search');
  var tbody = document.getElementById('tbody');
  var emptyMsg = document.getElementById('empty-msg');

  function showLoginErr(msg) {
    loginAlert.className = 'alert show alert-err';
    loginAlert.textContent = msg;
  }

  loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var pw = pwInput.value;
    if (!pw) { showLoginErr('Enter password.'); return; }
    loginBtn.classList.add('loading');
    loginBtn.disabled = true;
    fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw })
    })
    .then(function (r) {
      if (!r.ok) return r.json().then(function (d) { throw new Error(d.error); });
      return r.json();
    })
    .then(function (d) {
      token = d.token;
      loginSec.style.display = 'none';
      dashSec.style.display = 'block';
      load();
    })
    .catch(function (err) { showLoginErr(err.message); })
    .finally(function () { loginBtn.classList.remove('loading'); loginBtn.disabled = false; });
  });

  function load() {
    fetch('/api/admin/students', { headers: { 'Authorization': 'Bearer ' + token } })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      data = d.students || [];
      updateStats();
      render(data);
    });
  }

  function updateStats() {
    stTotal.textContent = String(data.length);
    var today = new Date().toISOString().split('T')[0];
    var c = 0;
    for (var i = 0; i < data.length; i++) {
      if (data[i].generatedAt && data[i].generatedAt.indexOf(today) === 0) c++;
    }
    stToday.textContent = String(c);
  }

  function render(list) {
    while (tbody.firstChild) tbody.removeChild(tbody.firstChild);
    if (list.length === 0) { emptyMsg.style.display = 'block'; return; }
    emptyMsg.style.display = 'none';

    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      var tr = document.createElement('tr');

      var td0 = document.createElement('td'); td0.textContent = String(i + 1); tr.appendChild(td0);
      var td1 = document.createElement('td'); td1.textContent = s.studentName; td1.style.fontWeight = '500'; td1.style.color = 'var(--text-heading)'; tr.appendChild(td1);

      var td2 = document.createElement('td');
      var sp2 = document.createElement('span'); sp2.className = 'tag tag-id'; sp2.textContent = s.studentId; td2.appendChild(sp2);
      tr.appendChild(td2);

      var td3 = document.createElement('td');
      if (s.generatedAt) {
        var dt = new Date(s.generatedAt);
        td3.textContent = dt.toLocaleDateString('en-GB') + ' ' + dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      }
      tr.appendChild(td3);

      var td4 = document.createElement('td');
      var sp4 = document.createElement('span'); sp4.className = 'tag tag-id'; sp4.textContent = s.finalToken || ''; td4.appendChild(sp4);
      tr.appendChild(td4);

      var td5 = document.createElement('td');
      if (s.cases) {
        for (var j = 0; j < s.cases.length; j++) {
          var c = s.cases[j];
          var badge = document.createElement('span');
          var cls = 'tag ';
          if (c.cipherType === 'caesar') cls += 'tag-caesar';
          else if (c.cipherType === 'multiplicative') cls += 'tag-mult';
          else if (c.cipherType === 'affine') cls += 'tag-affine';
          else if (c.cipherType === 'vigenere') cls += 'tag-vig';
          else if (c.cipherType === 'autokey') cls += 'tag-auto';
          badge.className = cls;
          badge.textContent = 'C' + c.caseNum + ':' + c.cipherType;
          td5.appendChild(badge);
        }
      }
      tr.appendChild(td5);

      var td6 = document.createElement('td');
      var ebtn = document.createElement('button');
      ebtn.className = 'exp-btn';
      ebtn.textContent = 'Show';
      ebtn.setAttribute('data-i', String(i));
      ebtn.addEventListener('click', (function (idx, b) {
        return function () { toggleDetail(idx, b); };
      })(i, ebtn));
      td6.appendChild(ebtn);
      tr.appendChild(td6);
      tbody.appendChild(tr);

      var dr = document.createElement('tr');
      dr.className = 'detail-row';
      dr.id = 'dr-' + i;
      var dtd = document.createElement('td');
      dtd.setAttribute('colspan', '7');
      var dbox = document.createElement('div');
      dbox.className = 'detail-box';
      dbox.textContent = buildDetail(s);
      dtd.appendChild(dbox);
      dr.appendChild(dtd);
      tbody.appendChild(dr);
    }
  }

  function buildDetail(s) {
    var lines = [];
    lines.push('ANSWER KEY: ' + s.studentName + ' (' + s.studentId + ')');
    lines.push('Token: ' + s.finalToken);
    if (s.opCode) lines.push('Operation Code: ' + s.opCode);
    if (s.noiseInterval) lines.push('Noise Interval (N): ' + s.noiseInterval);
    lines.push('Generated: ' + s.generatedAt);
    lines.push('');
    if (s.cases) {
      for (var i = 0; i < s.cases.length; i++) {
        var c = s.cases[i];
        lines.push('--- Case ' + c.caseNum + ': ' + c.cipherType.toUpperCase() + ' ---');
        lines.push('Key: ' + c.key);
        lines.push('Plaintext: ' + c.plaintext);
        lines.push('');
      }
    }
    if (s.stegoMessage) {
      lines.push('--- STEGO ---');
      lines.push(s.stegoMessage);
    }
    return lines.join('\n');
  }

  function toggleDetail(idx, btn) {
    var row = document.getElementById('dr-' + idx);
    if (!row) return;
    var vis = row.classList.contains('show');
    row.classList.toggle('show');
    btn.textContent = vis ? 'Show' : 'Hide';
  }

  searchInput.addEventListener('input', function () {
    var q = searchInput.value.trim().toLowerCase();
    if (!q) { render(data); return; }
    var filtered = data.filter(function (s) {
      return s.studentName.toLowerCase().indexOf(q) !== -1 || s.studentId.indexOf(q) !== -1;
    });
    render(filtered);
  });

  document.getElementById('btn-refresh').addEventListener('click', load);

  document.getElementById('btn-export').addEventListener('click', function () {
    fetch('/api/admin/export', { headers: { 'Authorization': 'Bearer ' + token } })
    .then(function (r) { return r.blob(); })
    .then(function (blob) {
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = 'students_export.csv';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
    });
  });

  var clearBtn = document.getElementById('btn-clear');
  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      if (confirm('Are you sure you want to delete all student records? This will clear all test data.')) {
        fetch('/api/admin/clear', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + token }
        })
        .then(function (r) { return r.json(); })
        .then(function () {
          load();
        });
      }
    });
  }
})();
