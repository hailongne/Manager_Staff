// Test isDepartmentHead logic
function isDepartmentHead(position) {
  if (!position) return false;

  const departmentHeadKeywords = [
    'truong ban',
    'truong phong',
    'truong bo phan',
    'truong nhom',
    'nhom truong',
    'head',
    'manager',
    'director'
  ];

  const normalized = position
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  return departmentHeadKeywords.some(keyword => normalized.includes(keyword));
}

// Test with different positions
console.log('Testing isDepartmentHead:');
console.log('Trưởng phòng:', isDepartmentHead('Trưởng phòng'));
console.log('Trưởng ban:', isDepartmentHead('Trưởng ban'));
console.log('Manager:', isDepartmentHead('Manager'));
console.log('Nhân viên:', isDepartmentHead('Nhân viên'));
console.log('null:', isDepartmentHead(null));
console.log('empty:', isDepartmentHead(''));

// Test normalization
console.log('\nTesting normalization:');
console.log('Trưởng phòng normalized:', 'Trưởng phòng'.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase());
console.log('Contains truong phong:', 'truong phong'.includes('truong phong'));