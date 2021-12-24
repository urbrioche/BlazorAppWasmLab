export function showModal(modalId){
    const element = document.querySelector(`#${modalId}`);
    const modal = bootstrap.Modal.getOrCreateInstance(element);
    modal.show();
}

export function closeModal(modalId){
    const element = document.querySelector(`#${modalId}`);
    const modal = bootstrap.Modal.getOrCreateInstance(element);
    modal.hide();
}
