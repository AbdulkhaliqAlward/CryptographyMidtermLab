'use strict';

(function () {
  var firstName = document.getElementById('f-first');
  var fatherName = document.getElementById('f-father');
  var familyName = document.getElementById('f-family');
  var idField = document.getElementById('f-id');
  var idErr = document.getElementById('id-err');
  var form = document.getElementById('lab-form');
  var btn = document.getElementById('submit-btn');
  var alertBox = document.getElementById('alert');
  var doneState = document.getElementById('done-state');

  function showAlert(type, msg) {
    alertBox.className = 'alert show alert-' + type;
    alertBox.textContent = msg;
  }
  function hideAlert() {
    alertBox.className = 'alert';
    alertBox.textContent = '';
  }

  function validateFields() {
    var valid = true;
    var fields = [firstName, fatherName, familyName];
    for (var i = 0; i < fields.length; i++) {
      var v = fields[i].value.trim();
      // Supports Arabic Unicode range, Latin characters, and hyphens/spaces
      if (!v || v.length < 2 || !/^[\u0600-\u06FF\u0750-\u077Fa-zA-Z\s\-]+$/.test(v)) {
        fields[i].classList.add('err');
        fields[i].classList.remove('ok');
        valid = false;
      } else {
        fields[i].classList.remove('err');
        fields[i].classList.add('ok');
      }
    }
    var id = idField.value.trim();
    if (!/^\d{4,16}$/.test(id)) {
      idField.classList.add('err');
      idField.classList.remove('ok');
      idErr.textContent = 'Enter 4-16 digits.';
      idErr.classList.add('show');
      valid = false;
    } else {
      idField.classList.remove('err');
      idField.classList.add('ok');
      idErr.textContent = '';
      idErr.classList.remove('show');
    }
    return valid;
  }

  idField.addEventListener('input', function () {
    idField.value = idField.value.replace(/\D/g, '');
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    hideAlert();
    if (!validateFields()) {
      showAlert('err', 'Please fill in all fields correctly.');
      return;
    }

    var fullName = [
      firstName.value.trim(),
      fatherName.value.trim(),
      familyName.value.trim()
    ].join(' ');
    var studentId = idField.value.trim();

    btn.classList.add('loading');
    btn.disabled = true;

    // Step 1: Validate and generate on server, get a one-time download token
    fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: fullName, studentId: studentId })
    })
    .then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok) throw new Error(data.error || 'Server error.');
        return data;
      });
    })
    .then(function (data) {
      // Step 2: Direct browser navigation to download the ZIP
      // This triggers a proper file download with Content-Disposition
      window.location.href = '/api/download/' + data.token;

      // Show success after a short delay
      setTimeout(function () {
        form.style.display = 'none';
        doneState.classList.add('show');
        showAlert('ok', 'Assignment generated and downloaded.');
      }, 1000);
    })
    .catch(function (err) {
      showAlert('err', err.message);
    })
    .finally(function () {
      btn.classList.remove('loading');
      btn.disabled = false;
    });
  });
})();
