function openSection(section) {
    let content = document.getElementById("content");
    if(section === 'football'){
        content.innerHTML = "<p>Прогнозы по футболу появятся здесь</p>";
    } else if(section === 'hockey'){
        content.innerHTML = "<p>Прогнозы по хоккею появятся здесь</p>";
    } else if(section === 'points'){
        content.innerHTML = "<p>Ваши баллы будут здесь</p>";
    }
}