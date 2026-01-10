function openModal(modalId) {
  console.log('openModal called with:', modalId);
  const element = document.getElementById(modalId);
  console.log('Element found:', element);
  if (element) {
    console.log('Current display:', element.style.display);
    element.style.display = 'flex';
    console.log('Display set to flex');
  } else {
    console.log('Element not found');
  }
}

function closeModal(modalId) {
  console.log('closeModal called with:', modalId);
  const element = document.getElementById(modalId);
  console.log('Element found:', element);
  if (element) {
    console.log('Current display:', element.style.display);
    element.style.display = 'none';
    console.log('Display set to none');
  } else {
    console.log('Element not found');
  }
}
