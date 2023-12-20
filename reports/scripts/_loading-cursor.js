function showLoadingBar(frameId, loadingElemId) {
    const rootDoc = window.parent.document;
    const iFrame = rootDoc.querySelector(`iframe#${frameId}`);
    if (iFrame == null) return;

    const loadingElem = document.createElement("div");
    loadingElem.id = loadingElemId;
    loadingElem.innerHTML = "<div class='webix_progress_top' role='progressbar' aria-valuemin='0' aria-valuemax='100' tabindex='0' style='color: #fff; height: 20px;'><div class='webix_progress_state' style='transition-duration: 10s; width: 0%; height: 100%;'> Loading...</div></div>";
    iFrame.parentElement.insertAdjacentElement("beforeBegin", loadingElem);
    iFrame.addEventListener("load", function() {
        loadingElem.remove();
    }, { once: true });

    setTimeout(function() {
        loadingElem.querySelector(".webix_progress_state").style.width = "100%";
    }, 1);
}
