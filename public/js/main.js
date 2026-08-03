/* Show / hide password field */
function togglePwd(id, btn) {
  const input = document.getElementById(id);
  if (!input) return;
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  btn.innerHTML = show ? '<i class="fa-regular fa-eye-slash"></i>' : '<i class="fa-regular fa-eye"></i>';
}

/* Dynamic medicine rows on the prescription form */
function addMedicineRow() {
  const wrap = document.getElementById('medicineRows');
  if (!wrap) return;
  const row = document.createElement('div');
  row.className = 'row g-2 mb-2 medicine-row';
  row.innerHTML = `
    <div class="col-md-4"><input type="text" name="medName" class="form-control" placeholder="Medicine name"></div>
    <div class="col-md-2"><input type="text" name="medDosage" class="form-control" placeholder="500mg"></div>
    <div class="col-md-3"><input type="text" name="medFrequency" class="form-control" placeholder="1-0-1 after food"></div>
    <div class="col-md-2"><input type="text" name="medDuration" class="form-control" placeholder="5 days"></div>
    <div class="col-md-1 d-grid">
      <button type="button" class="btn btn-outline-danger" onclick="removeMedicineRow(this)"><i class="fa-solid fa-trash"></i></button>
    </div>`;
  wrap.appendChild(row);
}

function removeMedicineRow(btn) {
  const rows = document.querySelectorAll('.medicine-row');
  if (rows.length <= 1) {
    btn.closest('.medicine-row').querySelectorAll('input').forEach((i) => (i.value = ''));
    return;
  }
  btn.closest('.medicine-row').remove();
}

/* Auto-dismiss flash alerts after 4s */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.alert-dismissible').forEach((el) => {
    setTimeout(() => bootstrap.Alert.getOrCreateInstance(el).close(), 4000);
  });

  // Prevent booking dates in the past
  document.querySelectorAll('input[type="date"][name="date"]').forEach((el) => {
    el.min = new Date().toISOString().split('T')[0];
  });
});
