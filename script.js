document.addEventListener('DOMContentLoaded', () => {

    // ========== STATE ==========
    const state = {
        currentStep: 'step-1',
        gender: null,
        method: null, // 'camera' or 'manual'
        footLengthMm: null,
        footWidthMm: null,
        // Manual inputs
        currentBrand: null,
        currentSize: null,
        fitIssue: null,
        // Shared
        activity: null,
        fitStyle: null,
        // Camera calibration
        calibrationPoints: [],
        footPoints: [],
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

    // Step 1
    const genderCards = document.querySelectorAll('.gender-card');
    // Step 2
    const methodCamera = document.getElementById('method-camera');
    const methodManual = document.getElementById('method-manual');
    // Manual
    const brandSelect = document.getElementById('current-brand');
    const sizeInput = document.getElementById('current-size');
    const fitBtns = document.querySelectorAll('.fit-issue-btn');
    // Step 4
    const activityCards = document.querySelectorAll('.activity-card');
    // Step 5
    const fitCards = document.querySelectorAll('.fit-style-card');

    // ========== INIT ==========
    updateProgress();

    // ========== EVENT LISTENERS ==========
    // Gender
    genderCards.forEach(c => c.addEventListener('click', () => {
        genderCards.forEach(x => x.classList.remove('selected'));
        c.classList.add('selected');
        state.gender = c.dataset.value;
        enableNext();
    }));

    // Method
    methodCamera.addEventListener('click', () => {
        state.method = 'camera';
        goToStep('step-camera');
    });
    methodManual.addEventListener('click', () => {
        state.method = 'manual';
        goToStep('step-manual');
    });

    // Manual inputs
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

    // Activity
    activityCards.forEach(c => c.addEventListener('click', () => {
        activityCards.forEach(x => x.classList.remove('selected'));
        c.classList.add('selected');
        state.activity = c.dataset.value;
        enableNext();
    }));

    // Fit Style
    fitCards.forEach(c => c.addEventListener('click', () => {
        fitCards.forEach(x => x.classList.remove('selected'));
        c.classList.add('selected');
        state.fitStyle = c.dataset.value;
        enableNext();
    }));

    // Navigation
    nextBtn.addEventListener('click', () => {
        if (nextBtn.classList.contains('disabled')) return;
        const order = getStepOrder();
        const idx = order.indexOf(state.currentStep);
        if (idx === order.length - 1) {
            showLoading();
        } else if (idx < order.length - 1) {
            goToStep(order[idx + 1]);
        }
    });

    backBtn.addEventListener('click', () => {
        const order = getStepOrder();
        const idx = order.indexOf(state.currentStep);
        if (idx > 0) {
            goToStep(order[idx - 1]);
        }
    });

    // ========== NAVIGATION ==========
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
        if (state.currentStep === 'step-1') {
            backBtn.classList.add('hidden');
        } else {
            backBtn.classList.remove('hidden');
        }

        // Hide footer for camera step & method selection & loading/result
        const hideFooter = ['step-2', 'step-camera', 'step-loading', 'step-result'].includes(state.currentStep);
        footer.style.display = hideFooter ? 'none' : 'block';

        const order = getStepOrder();
        const idx = order.indexOf(state.currentStep);
        if (idx === order.length - 1) {
            nextBtn.textContent = 'Sonucu Göster';
        } else {
            nextBtn.textContent = 'Devam Et';
        }
    }

    function updateProgress() {
        const order = getStepOrder();
        const idx = order.indexOf(state.currentStep);
        const pct = idx >= 0 ? ((idx + 1) / order.length) * 100 : 0;
        progressFill.style.width = `${pct}%`;
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
        if (state.currentBrand && state.currentSize && state.fitIssue) {
            enableNext();
        } else {
            disableNext();
        }
    }

    // ========== CAMERA FLOW ==========
    const startCameraBtn = document.getElementById('start-camera-btn');
    const captureBtn = document.getElementById('capture-btn');
    const video = document.getElementById('camera-video');
    const measureCanvas = document.getElementById('measure-canvas');
    const scanCanvas = document.getElementById('scan-canvas');
    let stream = null;

    startCameraBtn.addEventListener('click', async () => {
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 960 } }
            });
            video.srcObject = stream;
            showCameraPhase('capture');
        } catch (err) {
            // Camera not available — fall back to a simulated capture
            simulateCapture();
        }
    });

    captureBtn.addEventListener('click', () => {
        capturePhoto();
    });

    function showCameraPhase(phase) {
        document.querySelectorAll('#step-camera .camera-phase').forEach(p => p.classList.add('hidden'));
        document.getElementById(`camera-phase-${phase}`).classList.remove('hidden');
    }

    function capturePhoto() {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = video.videoWidth || 640;
        tempCanvas.height = video.videoHeight || 480;
        const ctx = tempCanvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        state.capturedImage = tempCanvas.toDataURL('image/jpeg');

        // Stop camera
        if (stream) stream.getTracks().forEach(t => t.stop());

        // Move to calibration
        showCalibrationPhase();
    }

    function simulateCapture() {
        // For desktop / no camera — create a placeholder image
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = 640;
        tempCanvas.height = 480;
        const ctx = tempCanvas.getContext('2d');
        ctx.fillStyle = '#1a1f2e';
        ctx.fillRect(0, 0, 640, 480);
        ctx.fillStyle = '#232940';
        ctx.fillRect(120, 60, 400, 360); // A4 placeholder
        ctx.font = '14px Inter';
        ctx.fillStyle = '#5A6478';
        ctx.textAlign = 'center';
        ctx.fillText('A4 Kağıt Alanı', 320, 240);
        // Draw a foot outline
        ctx.font = '80px serif';
        ctx.fillText('🦶', 300, 320);
        state.capturedImage = tempCanvas.toDataURL('image/jpeg');
        showCalibrationPhase();
    }

    function showCalibrationPhase() {
        showCameraPhase('calibrate');
        const ctx = measureCanvas.getContext('2d');
        const container = measureCanvas.parentElement;

        const img = new Image();
        img.onload = () => {
            measureCanvas.width = container.clientWidth;
            measureCanvas.height = container.clientHeight || 300;
            ctx.drawImage(img, 0, 0, measureCanvas.width, measureCanvas.height);
        };
        img.src = state.capturedImage;

        state.calibrationPoints = [];
        state.footPoints = [];
        updateTapDots();

        const hint = document.getElementById('calibrate-hint');
        hint.textContent = 'A4 kağıdının 2 köşesine dokunun';

        measureCanvas.addEventListener('click', handleCalibrationTap);
    }

    function handleCalibrationTap(e) {
        const rect = measureCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const ctx = measureCanvas.getContext('2d');

        const totalPoints = state.calibrationPoints.length + state.footPoints.length;

        if (state.calibrationPoints.length < 2) {
            state.calibrationPoints.push({ x, y });
            // Draw dot
            ctx.beginPath();
            ctx.arc(x, y, 8, 0, Math.PI * 2);
            ctx.fillStyle = '#00C9FF';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();

            if (state.calibrationPoints.length === 2) {
                // Draw line between calibration points
                ctx.beginPath();
                ctx.moveTo(state.calibrationPoints[0].x, state.calibrationPoints[0].y);
                ctx.lineTo(state.calibrationPoints[1].x, state.calibrationPoints[1].y);
                ctx.strokeStyle = '#00C9FF';
                ctx.lineWidth = 2;
                ctx.setLineDash([6, 4]);
                ctx.stroke();
                ctx.setLineDash([]);

                document.getElementById('calibrate-hint').textContent = 'Şimdi topuk ve en uzun parmak ucuna dokunun';
            }
        } else if (state.footPoints.length < 2) {
            state.footPoints.push({ x, y });
            // Draw dot (gold)
            ctx.beginPath();
            ctx.arc(x, y, 8, 0, Math.PI * 2);
            ctx.fillStyle = '#FBBF24';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();

            if (state.footPoints.length === 2) {
                // Draw foot line
                ctx.beginPath();
                ctx.moveTo(state.footPoints[0].x, state.footPoints[0].y);
                ctx.lineTo(state.footPoints[1].x, state.footPoints[1].y);
                ctx.strokeStyle = '#FBBF24';
                ctx.lineWidth = 2;
                ctx.setLineDash([6, 4]);
                ctx.stroke();
                ctx.setLineDash([]);

                measureCanvas.removeEventListener('click', handleCalibrationTap);
                // Calculate!
                calculateFootSize();
            }
        }

        updateTapDots();
    }

    function updateTapDots() {
        const total = state.calibrationPoints.length + state.footPoints.length;
        for (let i = 1; i <= 4; i++) {
            const dot = document.getElementById(`tap-${i}`);
            if (i <= total) dot.classList.add('done');
            else dot.classList.remove('done');
        }
    }

    function calculateFootSize() {
        // Pixel distance between A4 reference points
        const refDist = Math.sqrt(
            Math.pow(state.calibrationPoints[1].x - state.calibrationPoints[0].x, 2) +
            Math.pow(state.calibrationPoints[1].y - state.calibrationPoints[0].y, 2)
        );

        // A4 long edge = 297mm, short edge = 210mm. Assume user tapped the long edge.
        const mmPerPixel = 297 / refDist;

        // Foot length in pixels
        const footDist = Math.sqrt(
            Math.pow(state.footPoints[1].x - state.footPoints[0].x, 2) +
            Math.pow(state.footPoints[1].y - state.footPoints[0].y, 2)
        );

        state.footLengthMm = Math.round(footDist * mmPerPixel);
        // Estimate width from length (typical ratio)
        state.footWidthMm = Math.round(state.footLengthMm * 0.38);

        // Show scan animation
        setTimeout(() => startScanAnimation(), 500);
    }

    // ========== SCAN ANIMATION ==========
    function startScanAnimation() {
        showCameraPhase('scan');
        const ctx = scanCanvas.getContext('2d');
        const container = scanCanvas.parentElement;
        scanCanvas.width = container.clientWidth;
        scanCanvas.height = container.clientHeight || 350;

        // Draw captured image
        const img = new Image();
        img.onload = () => {
            ctx.drawImage(img, 0, 0, scanCanvas.width, scanCanvas.height);

            // Start scan line
            const scanLine = document.getElementById('scan-line');
            scanLine.classList.add('active');

            // Populate measurement values
            const footLen = state.footLengthMm || 265;
            const ballW = state.footWidthMm || Math.round(footLen * 0.38);
            const archW = Math.round(ballW * 0.86);
            const heelW = Math.round(ballW * 0.63);
            const toeReach = Math.round(footLen * 1.03);

            document.getElementById('m-length-val').textContent = `${footLen} mm`;
            document.getElementById('m-ball-val').textContent = `${ballW} mm`;
            document.getElementById('m-arch-val').textContent = `${archW} mm`;
            document.getElementById('m-heel-val').textContent = `${heelW} mm`;
            document.getElementById('m-toe-val').textContent = `${toeReach} mm`;

            // Animate labels appearing one by one
            const labels = document.querySelectorAll('.measure-label');
            labels.forEach((label, i) => {
                setTimeout(() => {
                    label.classList.add('visible');
                }, 800 + i * 500);
            });

            // Update status text
            const statusEl = document.getElementById('scan-status');
            setTimeout(() => { statusEl.textContent = 'Taban genişliği hesaplanıyor...'; }, 1000);
            setTimeout(() => { statusEl.textContent = 'Kemer ölçüsü alınıyor...'; }, 2000);
            setTimeout(() => { statusEl.textContent = 'Analiz tamamlandı ✓'; }, 3500);

            // After animation, proceed to activity step
            setTimeout(() => {
                goToStep('step-4');
                footer.style.display = 'block';
            }, 4500);
        };
        img.src = state.capturedImage;
    }

    // ========== LOADING & RESULT ==========
    function showLoading() {
        goToStep('step-loading');
        setTimeout(() => {
            document.getElementById('loading-text').textContent = 'Skechers veritabanı taranıyor...';
        }, 800);
        setTimeout(() => {
            document.getElementById('loading-text').textContent = 'Kalıp eşleştiriliyor...';
        }, 1600);
        setTimeout(() => {
            computeResult();
        }, 2400);
    }

    // ========== SIZING TABLES ==========
    // EU size → foot length in mm
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

    // Brand sizing offset (positive = brand runs large, so Skechers size should be smaller)
    const BRAND_OFFSET = {
        nike: 0,
        adidas: 0,
        skechers: 0,
        new_balance: -0.5,
        puma: 0,
        converse: 0.5,  // Converse runs large
        vans: 0,
        other: 0
    };

    function findSizeFromMm(mm) {
        let best = SIZE_TABLE[0];
        let minDiff = Infinity;
        for (const entry of SIZE_TABLE) {
            const diff = Math.abs(entry.mm - mm);
            if (diff < minDiff) {
                minDiff = diff;
                best = entry;
            }
        }
        return best;
    }

    function findSizeFromEu(eu) {
        let best = SIZE_TABLE[0];
        let minDiff = Infinity;
        for (const entry of SIZE_TABLE) {
            const diff = Math.abs(entry.eu - eu);
            if (diff < minDiff) {
                minDiff = diff;
                best = entry;
            }
        }
        return best;
    }

    function computeResult() {
        let sizeEntry;

        if (state.method === 'camera' && state.footLengthMm) {
            // Camera path: use measured foot length
            // Add ~5-10mm for comfort (shoes should be slightly longer than foot)
            let adjustedMm = state.footLengthMm + 7;
            sizeEntry = findSizeFromMm(adjustedMm);
        } else {
            // Manual path: use current size + brand offset
            let adjustedEu = state.currentSize;

            // Apply brand conversion
            const offset = BRAND_OFFSET[state.currentBrand] || 0;
            adjustedEu += offset;

            // Apply fit issue adjustment
            if (state.fitIssue === 'tight') adjustedEu += 0.5;
            if (state.fitIssue === 'loose') adjustedEu -= 0.5;

            sizeEntry = findSizeFromEu(adjustedEu);
        }

        // Activity-based tip adjustment
        let activityTip = '';
        if (state.activity === 'running') {
            activityTip = 'Koşu ayakkabılarında yarım numara büyük tercih etmenizi öneririz.';
            // For running, suggest half size up
        } else if (state.activity === 'walking') {
            activityTip = 'Yürüyüş için tam bedeniniz idealdir; comfort teknolojili modellere bakın.';
        } else if (state.activity === 'training') {
            activityTip = 'Salon antrenmanlarında ayağı saran, destekli bir kalıp performansınızı artırır.';
        } else {
            activityTip = 'Günlük kullanımda biraz daha ferah bir kalıp tüm gün konfor sağlar.';
        }

        // Fit style recommendation
        const fitNames = {
            classic: 'Classic Fit',
            relaxed: 'Relaxed Fit',
            wide: 'Wide Fit',
            extra_wide: 'Extra Wide Fit'
        };
        const fitName = fitNames[state.fitStyle] || 'Relaxed Fit';

        // Width tags
        const widthInfo = {
            classic: { men: 'D Width', women: 'B Width' },
            relaxed: { men: '1E Width', women: 'C Width' },
            wide: { men: '2E Width', women: '1E Width' },
            extra_wide: { men: '4E Width', women: '2E Width' }
        };
        const wInfo = widthInfo[state.fitStyle] || widthInfo.relaxed;
        const genderWidth = state.gender === 'female' ? wInfo.women : wInfo.men;

        // Populate result
        document.getElementById('final-size').textContent = sizeEntry.eu;
        document.getElementById('size-us').textContent = state.gender === 'female'
            ? (sizeEntry.usW || '—')
            : sizeEntry.usM;
        document.getElementById('size-uk').textContent = sizeEntry.uk;
        document.getElementById('size-cm').textContent = (sizeEntry.mm / 10).toFixed(1);
        document.getElementById('result-fit-name').textContent = `${fitName} (${genderWidth})`;

        const method = state.method === 'camera' ? 'kamera ölçümünüz' : 'mevcut ayakkabı bilgileriniz';
        document.getElementById('result-justification').textContent =
            `${method.charAt(0).toUpperCase() + method.slice(1)} ve ${fitName} tercihiniz göz önüne alındığında, Skechers ${sizeEntry.eu} numara size en iyi uyumu sağlayacaktır.`;

        document.getElementById('tip-1').textContent = activityTip;
        document.getElementById('tip-2').textContent = 'Akşam saatlerinde denemenizi öneririz — ayak gün boyunca hafif şişer.';

        goToStep('step-result');
    }

});
