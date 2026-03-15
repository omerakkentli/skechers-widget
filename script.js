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

    function getStepOrder() {
        return state.method === 'camera' ? STEP_ORDER_CAMERA : STEP_ORDER_MANUAL;
    }

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

    // ========== INIT ==========
    updateProgress();

    // ========== EVENTS: STEP 1 — GENDER ==========
    genderCards.forEach(c => c.addEventListener('click', () => {
        genderCards.forEach(x => x.classList.remove('selected'));
        c.classList.add('selected');
        state.gender = c.dataset.value;
        enableNext();
    }));

    // ========== EVENTS: STEP 2 — METHOD ==========
    methodCamera.addEventListener('click', () => {
        state.method = 'camera';
        goToStep('step-camera');
    });
    methodManual.addEventListener('click', () => {
        state.method = 'manual';
        goToStep('step-manual');
    });

    // ========== EVENTS: MANUAL FLOW ==========
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

    // ========== EVENTS: ACTIVITY ==========
    activityCards.forEach(c => c.addEventListener('click', () => {
        activityCards.forEach(x => x.classList.remove('selected'));
        c.classList.add('selected');
        state.activity = c.dataset.value;
        enableNext();
    }));

    // ========== EVENTS: FIT STYLE ==========
    fitCards.forEach(c => c.addEventListener('click', () => {
        fitCards.forEach(x => x.classList.remove('selected'));
        c.classList.add('selected');
        state.fitStyle = c.dataset.value;
        enableNext();
    }));

    // ========== NAVIGATION ==========
    nextBtn.addEventListener('click', () => {
        if (nextBtn.classList.contains('disabled')) return;
        const order = getStepOrder();
        const idx = order.indexOf(state.currentStep);
        if (idx === order.length - 1) {
            showLoading();
        } else {
            goToStep(order[idx + 1]);
        }
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
    }

    function updateNav() {
        backBtn.classList.toggle('hidden', state.currentStep === 'step-1');

        const hideFooter = ['step-2', 'step-camera', 'step-loading', 'step-result'].includes(state.currentStep);
        footer.style.display = hideFooter ? 'none' : 'block';

        const order = getStepOrder();
        const idx = order.indexOf(state.currentStep);
        nextBtn.textContent = idx === order.length - 1 ? 'Sonucu Göster' : 'Devam Et';
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
    //  CAMERA FLOW — Simple: Open → Capture → Review/Retake → Scan
    // ================================================================
    const startCameraBtn = document.getElementById('start-camera-btn');
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

    // Phase 1 → Phase 2: Open camera
    startCameraBtn.addEventListener('click', async () => {
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 960 } }
            });
            video.srcObject = stream;
            await video.play();
            showCameraPhase('capture');
        } catch (err) {
            console.warn('Camera not available, using simulated capture:', err);
            simulateCapture();
        }
    });

    // Phase 2 → Phase 3: Capture photo
    captureBtn.addEventListener('click', () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        state.capturedImage = canvas.toDataURL('image/jpeg', 0.85);

        // Stop camera stream
        if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }

        // Show review
        reviewImage.src = state.capturedImage;
        showCameraPhase('review');
    });

    // Phase 3: Retake — go back to camera
    retakeBtn.addEventListener('click', async () => {
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

    // Phase 3 → Phase 4: Confirm & start scan
    confirmPhotoBtn.addEventListener('click', () => {
        // Generate simulated measurements (in real app this would be ML-based)
        generateMeasurements();
        startScanAnimation();
    });

    // Desktop fallback (no camera)
    function simulateCapture() {
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext('2d');

        // Dark background with foot placeholder
        ctx.fillStyle = '#1a1f2e';
        ctx.fillRect(0, 0, 640, 480);
        // A4 paper area
        ctx.fillStyle = '#232940';
        ctx.strokeStyle = '#3D4560';
        ctx.lineWidth = 2;
        ctx.fillRect(140, 40, 360, 400);
        ctx.strokeRect(140, 40, 360, 400);
        // Foot emoji
        ctx.font = '100px serif';
        ctx.textAlign = 'center';
        ctx.fillText('🦶', 320, 300);
        // Label
        ctx.font = '13px Inter, sans-serif';
        ctx.fillStyle = '#5A6478';
        ctx.fillText('Simulated capture (desktop)', 320, 460);

        state.capturedImage = canvas.toDataURL('image/jpeg');
        reviewImage.src = state.capturedImage;
        showCameraPhase('review');
    }

    function generateMeasurements() {
        // In a real implementation, this would use AR/ML to measure.
        // We generate plausible values based on gender for demo purposes.
        if (state.gender === 'female') {
            state.footLengthMm = 235 + Math.floor(Math.random() * 20); // 235–255mm
            state.footWidthMm = Math.round(state.footLengthMm * 0.37);
        } else {
            state.footLengthMm = 258 + Math.floor(Math.random() * 25); // 258–283mm
            state.footWidthMm = Math.round(state.footLengthMm * 0.39);
        }
    }

    // ========== SCAN ANIMATION ==========
    function startScanAnimation() {
        showCameraPhase('scan');

        const container = scanCanvas.parentElement;
        scanCanvas.width = container.clientWidth;
        scanCanvas.height = container.clientHeight || 350;
        const ctx = scanCanvas.getContext('2d');

        // Draw captured image onto scan canvas
        const img = new Image();
        img.onload = () => {
            ctx.drawImage(img, 0, 0, scanCanvas.width, scanCanvas.height);

            // Start scan line animation
            const scanLine = document.getElementById('scan-line');
            scanLine.classList.add('active');

            // Calculate measurement values
            const footLen = state.footLengthMm;
            const ballW = state.footWidthMm;
            const archW = Math.round(ballW * 0.86);
            const heelW = Math.round(ballW * 0.63);
            const toeReach = Math.round(footLen * 1.03);

            document.getElementById('m-length-val').textContent = `${footLen} mm`;
            document.getElementById('m-ball-val').textContent = `${ballW} mm`;
            document.getElementById('m-arch-val').textContent = `${archW} mm`;
            document.getElementById('m-heel-val').textContent = `${heelW} mm`;
            document.getElementById('m-toe-val').textContent = `${toeReach} mm`;

            // Animate measurement labels appearing one by one
            const labels = document.querySelectorAll('.measure-label');
            labels.forEach((label, i) => {
                setTimeout(() => label.classList.add('visible'), 800 + i * 500);
            });

            // Update status text progressively
            const statusEl = document.getElementById('scan-status');
            setTimeout(() => { statusEl.textContent = 'Taban genişliği hesaplanıyor...'; }, 1000);
            setTimeout(() => { statusEl.textContent = 'Kemer ve topuk analiz ediliyor...'; }, 2000);
            setTimeout(() => { statusEl.textContent = 'Parmak erişimi ölçülüyor...'; }, 3000);
            setTimeout(() => { statusEl.textContent = 'Analiz tamamlandı ✓'; statusEl.style.color = '#34D399'; }, 4000);

            // After animation completes, move to activity selection
            setTimeout(() => {
                goToStep('step-4');
                footer.style.display = 'block';
            }, 5000);
        };
        img.src = state.capturedImage;
    }

    // ========== LOADING & RESULT ==========
    function showLoading() {
        goToStep('step-loading');
        setTimeout(() => { document.getElementById('loading-text').textContent = 'Skechers veritabanı taranıyor...'; }, 800);
        setTimeout(() => { document.getElementById('loading-text').textContent = 'Kalıp eşleştiriliyor...'; }, 1600);
        setTimeout(() => computeResult(), 2400);
    }

    // ========== SIZING TABLE ==========
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

    const BRAND_OFFSET = {
        nike: 0, adidas: 0, skechers: 0, new_balance: -0.5,
        puma: 0, converse: 0.5, vans: 0, other: 0
    };

    function findSizeFromMm(mm) {
        return SIZE_TABLE.reduce((best, e) => Math.abs(e.mm - mm) < Math.abs(best.mm - mm) ? e : best);
    }

    function findSizeFromEu(eu) {
        return SIZE_TABLE.reduce((best, e) => Math.abs(e.eu - eu) < Math.abs(best.eu - eu) ? e : best);
    }

    function computeResult() {
        let sizeEntry;

        if (state.method === 'camera' && state.footLengthMm) {
            // Camera: foot length + comfort margin
            sizeEntry = findSizeFromMm(state.footLengthMm + 7);
        } else {
            // Manual: current size adjusted for brand + fit
            let adjustedEu = state.currentSize;
            adjustedEu += (BRAND_OFFSET[state.currentBrand] || 0);
            if (state.fitIssue === 'tight') adjustedEu += 0.5;
            if (state.fitIssue === 'loose') adjustedEu -= 0.5;
            sizeEntry = findSizeFromEu(adjustedEu);
        }

        // Activity tip
        const activityTips = {
            running: 'Koşu ayakkabılarında yarım numara büyük tercih etmenizi öneririz.',
            walking: 'Yürüyüş için tam bedeniniz idealdir; comfort teknolojili modellere bakın.',
            training: 'Salon antrenmanlarında ayağı saran, destekli bir kalıp performansınızı artırır.',
            casual: 'Günlük kullanımda biraz daha ferah bir kalıp tüm gün konfor sağlar.'
        };

        // Fit style
        const fitNames = { classic: 'Classic Fit', relaxed: 'Relaxed Fit', wide: 'Wide Fit', extra_wide: 'Extra Wide Fit' };
        const widthInfo = {
            classic: { men: 'D Width', women: 'B Width' },
            relaxed: { men: '1E Width', women: 'C Width' },
            wide: { men: '2E Width', women: '1E Width' },
            extra_wide: { men: '4E Width', women: '2E Width' }
        };

        const fitName = fitNames[state.fitStyle] || 'Relaxed Fit';
        const wInfo = widthInfo[state.fitStyle] || widthInfo.relaxed;
        const genderWidth = state.gender === 'female' ? wInfo.women : wInfo.men;

        // Populate result
        document.getElementById('final-size').textContent = sizeEntry.eu;
        document.getElementById('size-us').textContent = state.gender === 'female' ? (sizeEntry.usW || '—') : sizeEntry.usM;
        document.getElementById('size-uk').textContent = sizeEntry.uk;
        document.getElementById('size-cm').textContent = (sizeEntry.mm / 10).toFixed(1);
        document.getElementById('result-fit-name').textContent = `${fitName} (${genderWidth})`;

        const method = state.method === 'camera' ? 'kamera ölçümünüz' : 'mevcut ayakkabı bilgileriniz';
        document.getElementById('result-justification').textContent =
            `${method.charAt(0).toUpperCase() + method.slice(1)} ve ${fitName} tercihiniz göz önüne alındığında, Skechers ${sizeEntry.eu} numara size en iyi uyumu sağlayacaktır.`;

        document.getElementById('tip-1').textContent = activityTips[state.activity] || activityTips.casual;
        document.getElementById('tip-2').textContent = 'Akşam saatlerinde denemenizi öneririz — ayak gün boyunca hafif şişer.';

        goToStep('step-result');
    }

});
