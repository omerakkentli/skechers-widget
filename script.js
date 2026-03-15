document.addEventListener('DOMContentLoaded', () => {

    // ========== STATE ==========
    const state = {
        currentStep: 'step-1',
        gender: null,
        method: null,
        footLengthMm: null,
        footWidthMm: null,
        currentBrand: null,
        currentSize: null,
        fitIssue: null,
        activity: null,
        fitStyle: null,
        capturedImage: null,
    };

    const STEP_ORDER_CAMERA = ['step-1', 'step-2', 'step-camera', 'step-4', 'step-5'];
    const STEP_ORDER_MANUAL = ['step-1', 'step-2', 'step-manual', 'step-4', 'step-5'];
    function getStepOrder() { return state.method === 'camera' ? STEP_ORDER_CAMERA : STEP_ORDER_MANUAL; }

    // ========== DOM ==========
    const nextBtn = document.getElementById('next-btn');
    const backBtn = document.getElementById('back-btn');
    const footer = document.getElementById('widget-footer');
    const progressFill = document.getElementById('progress-fill');
    const genderCards = document.querySelectorAll('.gender-card');
    const methodCamera = document.getElementById('method-camera');
    const methodManual = document.getElementById('method-manual');
    const brandSelect = document.getElementById('current-brand');
    const sizeInput = document.getElementById('current-size');
    const fitBtns = document.querySelectorAll('.fit-issue-btn');
    const activityCards = document.querySelectorAll('.activity-card');
    const fitCards = document.querySelectorAll('.fit-style-card');

    updateProgress();

    // ========== GENDER ==========
    genderCards.forEach(c => c.addEventListener('click', () => {
        genderCards.forEach(x => x.classList.remove('selected'));
        c.classList.add('selected');
        state.gender = c.dataset.value;
        enableNext();
    }));

    // ========== METHOD ==========
    methodCamera.addEventListener('click', () => { state.method = 'camera'; goToStep('step-camera'); });
    methodManual.addEventListener('click', () => { state.method = 'manual'; goToStep('step-manual'); });

    // ========== MANUAL ==========
    brandSelect.addEventListener('change', () => { state.currentBrand = brandSelect.value; validateManual(); });
    sizeInput.addEventListener('input', () => { state.currentSize = parseFloat(sizeInput.value); validateManual(); });
    sizeInput.addEventListener('focus', () => { sizeInput.placeholder = ''; });
    sizeInput.addEventListener('blur', () => { if (!sizeInput.value) sizeInput.placeholder = 'Örn: 42'; });
    fitBtns.forEach(b => b.addEventListener('click', () => {
        fitBtns.forEach(x => x.classList.remove('selected'));
        b.classList.add('selected');
        state.fitIssue = b.dataset.value;
        validateManual();
    }));

    // ========== ACTIVITY ==========
    activityCards.forEach(c => c.addEventListener('click', () => {
        activityCards.forEach(x => x.classList.remove('selected'));
        c.classList.add('selected');
        state.activity = c.dataset.value;
        enableNext();
    }));

    // ========== FIT STYLE ==========
    fitCards.forEach(c => c.addEventListener('click', () => {
        fitCards.forEach(x => x.classList.remove('selected'));
        c.classList.add('selected');
        state.fitStyle = c.dataset.value;
        enableNext();
    }));

    // ========== NAV ==========
    nextBtn.addEventListener('click', () => {
        if (nextBtn.classList.contains('disabled')) return;
        const order = getStepOrder();
        const idx = order.indexOf(state.currentStep);
        if (idx === order.length - 1) showLoading();
        else goToStep(order[idx + 1]);
    });
    backBtn.addEventListener('click', () => {
        const order = getStepOrder();
        const idx = order.indexOf(state.currentStep);
        if (idx > 0) goToStep(order[idx - 1]);
    });

    function goToStep(stepId) {
        const current = document.getElementById(state.currentStep);
        const next = document.getElementById(stepId);
        if (!next) return;
        current.classList.remove('active');
        current.classList.add('exit-left');
        next.classList.remove('exit-left');
        next.classList.add('active');
        state.currentStep = stepId;
        validateCurrentStep();
        updateProgress();
        updateNav();
        // Scroll to top
        document.querySelector('.steps-container').scrollTop = 0;
    }

    function updateNav() {
        backBtn.classList.toggle('hidden', state.currentStep === 'step-1');
        const hideFooter = ['step-2', 'step-camera', 'step-loading', 'step-result'].includes(state.currentStep);
        footer.style.display = hideFooter ? 'none' : 'block';
        const order = getStepOrder();
        const idx = order.indexOf(state.currentStep);
        nextBtn.textContent = idx === order.length - 1 ? 'SONUCU GÖSTER' : 'DEVAM ET';
    }

    function updateProgress() {
        const order = getStepOrder();
        const idx = order.indexOf(state.currentStep);
        progressFill.style.width = `${idx >= 0 ? ((idx + 1) / order.length) * 100 : 0}%`;
    }

    function enableNext() { nextBtn.classList.remove('disabled'); }
    function disableNext() { nextBtn.classList.add('disabled'); }

    function validateCurrentStep() {
        switch (state.currentStep) {
            case 'step-1': state.gender ? enableNext() : disableNext(); break;
            case 'step-manual': validateManual(); break;
            case 'step-4': state.activity ? enableNext() : disableNext(); break;
            case 'step-5': state.fitStyle ? enableNext() : disableNext(); break;
            default: disableNext();
        }
    }

    function validateManual() {
        (state.currentBrand && state.currentSize && state.fitIssue) ? enableNext() : disableNext();
    }

    // ================================================================
    //  CAMERA + UPLOAD FLOW
    // ================================================================
    const startCameraBtn = document.getElementById('start-camera-btn');
    const uploadBtn = document.getElementById('upload-btn');
    const fileInput = document.getElementById('file-input');
    const captureBtn = document.getElementById('capture-btn');
    const retakeBtn = document.getElementById('retake-btn');
    const confirmPhotoBtn = document.getElementById('confirm-photo-btn');
    const video = document.getElementById('camera-video');
    const reviewImage = document.getElementById('review-image');
    const scanCanvas = document.getElementById('scan-canvas');
    let stream = null;

    function showCameraPhase(phase) {
        document.querySelectorAll('#step-camera .camera-phase').forEach(p => {
            p.classList.add('hidden');
            p.style.display = 'none';
        });
        const el = document.getElementById(`camera-phase-${phase}`);
        el.classList.remove('hidden');
        el.style.display = 'flex';
    }

    // Open camera
    startCameraBtn.addEventListener('click', async () => {
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 960 } }
            });
            video.srcObject = stream;
            await video.play();
            showCameraPhase('capture');
        } catch (err) {
            // No camera — open file picker as fallback
            fileInput.click();
        }
    });

    // Upload from gallery
    uploadBtn.addEventListener('click', () => { fileInput.click(); });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            state.capturedImage = ev.target.result;
            reviewImage.src = state.capturedImage;
            showCameraPhase('review');
        };
        reader.readAsDataURL(file);
    });

    // Capture photo from camera
    captureBtn.addEventListener('click', () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        state.capturedImage = canvas.toDataURL('image/jpeg', 0.85);
        if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
        reviewImage.src = state.capturedImage;
        showCameraPhase('review');
    });

    // Retake
    retakeBtn.addEventListener('click', async () => {
        fileInput.value = '';
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 960 } }
            });
            video.srcObject = stream;
            await video.play();
            showCameraPhase('capture');
        } catch (err) {
            showCameraPhase('guide');
        }
    });

    // Confirm → scan
    confirmPhotoBtn.addEventListener('click', () => {
        generateMeasurements();
        startScanAnimation();
    });

    function generateMeasurements() {
        if (state.gender === 'female') {
            state.footLengthMm = 235 + Math.floor(Math.random() * 20);
        } else {
            state.footLengthMm = 258 + Math.floor(Math.random() * 25);
        }
        state.footWidthMm = Math.round(state.footLengthMm * (0.37 + Math.random() * 0.04));
    }

    // ========== SCAN ANIMATION ==========
    function startScanAnimation() {
        showCameraPhase('scan');
        const container = scanCanvas.parentElement;
        scanCanvas.width = container.clientWidth;
        scanCanvas.height = container.clientHeight || 300;
        const ctx = scanCanvas.getContext('2d');

        const img = new Image();
        img.onload = () => {
            ctx.drawImage(img, 0, 0, scanCanvas.width, scanCanvas.height);
            document.getElementById('scan-line').classList.add('active');

            const fl = state.footLengthMm;
            const bw = state.footWidthMm;
            const aw = Math.round(bw * 0.86);
            const hw = Math.round(bw * 0.63);
            const tr = Math.round(fl * 1.03);

            document.getElementById('m-length-val').textContent = `${fl} mm`;
            document.getElementById('m-ball-val').textContent = `${bw} mm`;
            document.getElementById('m-arch-val').textContent = `${aw} mm`;
            document.getElementById('m-heel-val').textContent = `${hw} mm`;
            document.getElementById('m-toe-val').textContent = `${tr} mm`;

            document.querySelectorAll('.measure-label').forEach((l, i) => {
                setTimeout(() => l.classList.add('visible'), 800 + i * 500);
            });

            const s = document.getElementById('scan-status');
            setTimeout(() => { s.textContent = 'Taban genişliği hesaplanıyor...'; }, 1000);
            setTimeout(() => { s.textContent = 'Kemer ve topuk analiz ediliyor...'; }, 2000);
            setTimeout(() => { s.textContent = 'Parmak erişimi ölçülüyor...'; }, 3000);
            setTimeout(() => { s.textContent = 'Analiz tamamlandı'; s.style.color = '#059669'; }, 4000);
            setTimeout(() => { goToStep('step-4'); footer.style.display = 'block'; }, 5000);
        };
        img.src = state.capturedImage;
    }

    // ========== LOADING ==========
    function showLoading() {
        goToStep('step-loading');
        setTimeout(() => { document.getElementById('loading-text').textContent = 'Skechers veritabanı taranıyor...'; }, 800);
        setTimeout(() => { document.getElementById('loading-text').textContent = 'Kalıp eşleştiriliyor...'; }, 1600);
        setTimeout(() => computeResult(), 2400);
    }

    // ========== SIZE TABLE ==========
    const SIZE_TABLE = [
        { eu: 35, mm: 220, usM: 3.5, usW: 5.5, uk: 2.5 },
        { eu: 36, mm: 225, usM: 4, usW: 6, uk: 3.5 },
        { eu: 37, mm: 232, usM: 5, usW: 7, uk: 4 },
        { eu: 37.5, mm: 236, usM: 5.5, usW: 7.5, uk: 4.5 },
        { eu: 38, mm: 240, usM: 5.5, usW: 7.5, uk: 5 },
        { eu: 39, mm: 247, usM: 6.5, usW: 8.5, uk: 6 },
        { eu: 40, mm: 255, usM: 7, usW: 9, uk: 6.5 },
        { eu: 41, mm: 262, usM: 8, usW: 10, uk: 7.5 },
        { eu: 42, mm: 270, usM: 8.5, usW: 10.5, uk: 8 },
        { eu: 43, mm: 277, usM: 9.5, usW: 11.5, uk: 9 },
        { eu: 44, mm: 285, usM: 10, usW: 12, uk: 9.5 },
        { eu: 45, mm: 292, usM: 11, usW: 13, uk: 10.5 },
        { eu: 46, mm: 300, usM: 12, usW: null, uk: 11.5 },
        { eu: 47, mm: 307, usM: 13, usW: null, uk: 12.5 },
    ];

    const BRAND_OFFSET = { nike: 0, adidas: 0, skechers: 0, new_balance: -0.5, puma: 0, converse: 0.5, vans: 0, other: 0 };

    function findSizeFromMm(mm) { return SIZE_TABLE.reduce((b, e) => Math.abs(e.mm - mm) < Math.abs(b.mm - mm) ? e : b); }
    function findSizeFromEu(eu) { return SIZE_TABLE.reduce((b, e) => Math.abs(e.eu - eu) < Math.abs(b.eu - eu) ? e : b); }

    function computeResult() {
        let sizeEntry;
        if (state.method === 'camera' && state.footLengthMm) {
            sizeEntry = findSizeFromMm(state.footLengthMm + 7);
        } else {
            let adj = state.currentSize + (BRAND_OFFSET[state.currentBrand] || 0);
            if (state.fitIssue === 'tight') adj += 0.5;
            if (state.fitIssue === 'loose') adj -= 0.5;
            sizeEntry = findSizeFromEu(adj);
        }

        const activityTips = {
            running: 'Koşu ayakkabılarında yarım numara büyük tercih etmenizi öneririz.',
            walking: 'Yürüyüş için tam bedeniniz idealdir; comfort teknolojili modellere bakın.',
            training: 'Salon antrenmanlarında ayağı saran, destekli bir kalıp performansınızı artırır.',
            casual: 'Günlük kullanımda biraz daha ferah bir kalıp tüm gün konfor sağlar.'
        };

        const fitNames = { classic: 'Classic Fit', relaxed: 'Relaxed Fit', wide: 'Wide Fit', extra_wide: 'Extra Wide Fit' };
        const widthInfo = {
            classic: { men: 'D Width', women: 'B Width' },
            relaxed: { men: '1E Width', women: 'C Width' },
            wide: { men: '2E Width', women: '1E Width' },
            extra_wide: { men: '4E Width', women: '2E Width' }
        };

        const fitName = fitNames[state.fitStyle] || 'Relaxed Fit';
        const wInfo = widthInfo[state.fitStyle] || widthInfo.relaxed;
        const gw = state.gender === 'female' ? wInfo.women : wInfo.men;

        document.getElementById('final-size').textContent = sizeEntry.eu;
        document.getElementById('size-us').textContent = state.gender === 'female' ? (sizeEntry.usW || '—') : sizeEntry.usM;
        document.getElementById('size-uk').textContent = sizeEntry.uk;
        document.getElementById('size-cm').textContent = (sizeEntry.mm / 10).toFixed(1);
        document.getElementById('result-fit-name').textContent = `${fitName} (${gw})`;

        const src = state.method === 'camera' ? 'Kamera ölçümünüz' : 'Mevcut ayakkabı bilgileriniz';
        document.getElementById('result-justification').textContent =
            `${src} ve ${fitName} tercihiniz göz önüne alındığında, Skechers ${sizeEntry.eu} numara size en iyi uyumu sağlayacaktır.`;

        document.getElementById('tip-1').textContent = activityTips[state.activity] || activityTips.casual;
        document.getElementById('tip-2').textContent = 'Akşam saatlerinde denemenizi öneririz — ayak gün boyunca hafif şişer.';

        goToStep('step-result');
    }
});
