import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';
import {
  Save,
  ArrowLeft,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Fingerprint,
  CheckCircle2,
  ScanLine,
  Camera,
  CameraOff,
  RotateCcw,
  X,
  UserRound,
  UsersRound,
  Info,
  Sparkles,
  User,
  Users,
  MapPin,
  Phone,
  Building2,
  Check,
} from 'lucide-react';

const EMPTY_GUARANTOR = {
  name: '',
  fatherName: '',
  mobileNumber: '',
  cnic: '',
  relation: '',
  address: '',
  fingerprintFmd: '',
  fingerprintImage: '',
  fingerprintCapturedAt: null,
  liveImage: '',
  liveImageCapturedAt: null,
};

const AddEditCustomer = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const isEditMode = Boolean(id);

  // =========================================================
  // FORM DATA
  // =========================================================
  const [formData, setFormData] = useState({
    fullName: '',
    fatherName: '',
    mobileNumber: '',
    alternateMobileNumber: '',
    cnic: '',
    address: '',
    city: 'Sangla Hill',
    email: '',
    notes: '',

    // CUSTOMER FINGERPRINT
    fingerprintFmd: '',
    fingerprintImage: '',
    fingerprintCapturedAt: null,

    // CUSTOMER LIVE CAMERA PHOTO
    liveImage: '',
    liveImageCapturedAt: null,

    // GUARANTORS
    guarantor1: {
      ...EMPTY_GUARANTOR,
    },
    guarantor2: {
      ...EMPTY_GUARANTOR,
    },
  });

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // =========================================================
  // FINGERPRINT STATES
  // =========================================================
  const [fingerprintStatus, setFingerprintStatus] = useState({
    customer: 'idle',
    guarantor1: 'idle',
    guarantor2: 'idle',
  });

  const [fingerprintMessage, setFingerprintMessage] = useState({
    customer: '',
    guarantor1: '',
    guarantor2: '',
  });

  const [activeFingerprint, setActiveFingerprint] = useState(null);

  // =========================================================
  // CAMERA STATES
  // =========================================================
  const [cameraOpen, setCameraOpen] = useState(false);
  const [activeCameraPerson, setActiveCameraPerson] = useState(null);

  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState('');

  const [cameraDevices, setCameraDevices] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraStreamRef = useRef(null);

  // =========================================================
  // DATE/TIME FORMAT
  // =========================================================
  const formatCaptureDateTime = (dateValue) => {
    if (!dateValue) return '';
    try {
      const date = new Date(dateValue);
      if (Number.isNaN(date.getTime())) return '';
      return date.toLocaleString('en-PK', {
        dateStyle: 'medium',
        timeStyle: 'medium',
      });
    } catch {
      return '';
    }
  };

  const getImageSource = (image) => {
    if (!image || typeof image !== 'string') return '';
    if (
      image.startsWith('data:image/') ||
      image.startsWith('http://') ||
      image.startsWith('https://') ||
      image.startsWith('blob:')
    ) {
      return image;
    }
    return `data:image/jpeg;base64,${image}`;
  };

  // =========================================================
  // FETCH CUSTOMER FOR EDIT
  // =========================================================
  useEffect(() => {
    if (!isEditMode) return;

    const fetchCustomerDetails = async () => {
      try {
        setFetching(true);
        setErrorMsg('');

        const response = await api.get(`/customers/${id}`);

        if (!response.data || !response.data.success) {
          throw new Error(
            response.data?.message || 'Customer details could not be loaded.'
          );
        }

        const data = response.data.data;

        const guarantor1 = {
          ...EMPTY_GUARANTOR,
          ...(data.guarantor1 || {}),
          fingerprintFmd: data.guarantor1?.fingerprintFmd || '',
          fingerprintImage: data.guarantor1?.fingerprintImage || '',
          fingerprintCapturedAt: data.guarantor1?.fingerprintCapturedAt || null,
          liveImage: data.guarantor1?.liveImage || '',
          liveImageCapturedAt: data.guarantor1?.liveImageCapturedAt || null,
        };

        const guarantor2 = {
          ...EMPTY_GUARANTOR,
          ...(data.guarantor2 || {}),
          fingerprintFmd: data.guarantor2?.fingerprintFmd || '',
          fingerprintImage: data.guarantor2?.fingerprintImage || '',
          fingerprintCapturedAt: data.guarantor2?.fingerprintCapturedAt || null,
          liveImage: data.guarantor2?.liveImage || '',
          liveImageCapturedAt: data.guarantor2?.liveImageCapturedAt || null,
        };

        setFormData({
          fullName: data.fullName || '',
          fatherName: data.fatherName || '',
          mobileNumber: data.mobileNumber || '',
          alternateMobileNumber: data.alternateMobileNumber || '',
          cnic: data.cnic || '',
          address: data.address || '',
          city: data.city || 'Sangla Hill',
          email: data.email || '',
          notes: data.notes || '',
          fingerprintFmd: data.fingerprintFmd || '',
          fingerprintImage: data.fingerprintImage || '',
          fingerprintCapturedAt: data.fingerprintCapturedAt || null,
          liveImage: data.liveImage || '',
          liveImageCapturedAt: data.liveImageCapturedAt || null,
          guarantor1,
          guarantor2,
        });

        setFingerprintStatus({
          customer: data.fingerprintFmd ? 'captured' : 'idle',
          guarantor1: guarantor1.fingerprintFmd ? 'captured' : 'idle',
          guarantor2: guarantor2.fingerprintFmd ? 'captured' : 'idle',
        });

        setFingerprintMessage({
          customer: data.fingerprintFmd ? 'Fingerprint already captured.' : '',
          guarantor1: guarantor1.fingerprintFmd ? 'Fingerprint already captured.' : '',
          guarantor2: guarantor2.fingerprintFmd ? 'Fingerprint already captured.' : '',
        });
      } catch (error) {
        console.error('FETCH CUSTOMER ERROR:', error);
        setErrorMsg(
          error.response?.data?.message ||
            error.message ||
            'Failed to load customer details from system.'
        );
      } finally {
        setFetching(false);
      }
    };

    fetchCustomerDetails();
  }, [id, isEditMode]);

  // =========================================================
  // INPUT HANDLERS (CNIC AUTO-FORMATTING)
  // =========================================================
  const handleChange = (e) => {
    let { name, value } = e.target;

    if (name === 'cnic') {
      value = value.replace(/[^0-9]/g, '');
      if (value.length > 5 && value.length <= 12) {
        value = `${value.slice(0, 5)}-${value.slice(5)}`;
      } else if (value.length > 12) {
        value = `${value.slice(0, 5)}-${value.slice(5, 12)}-${value.slice(12, 13)}`;
      }
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleGuarantorChange = (guarantorKey, field, val) => {
    let value = val;
    if (field === 'cnic') {
      value = value.replace(/[^0-9]/g, '');
      if (value.length > 5 && value.length <= 12) {
        value = `${value.slice(0, 5)}-${value.slice(5)}`;
      } else if (value.length > 12) {
        value = `${value.slice(0, 5)}-${value.slice(5, 12)}-${value.slice(12, 13)}`;
      }
    }

    setFormData((prev) => ({
      ...prev,
      [guarantorKey]: {
        ...prev[guarantorKey],
        [field]: value,
      },
    }));
  };

  // =========================================================
  // BIOMETRIC FINGERPRINT CAPTURE
  // =========================================================
  const checkFingerprintAgent = async () => {
    try {
      const response = await fetch('http://127.0.0.1:9000/health', {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Fingerprint agent unavailable.');
      }

      const data = await response.json();
      if (!data.success || !data.readerConnected) {
        throw new Error('Fingerprint reader is not connected.');
      }

      return true;
    } catch (error) {
      console.error('FINGERPRINT HEALTH ERROR:', error);
      throw new Error(
        'Fingerprint scanner agent is not running or DigitalPersona reader is not connected.'
      );
    }
  };

  const captureFingerprint = async (personType) => {
    if (activeFingerprint) return;

    try {
      setErrorMsg('');
      setActiveFingerprint(personType);

      setFingerprintStatus((prev) => ({
        ...prev,
        [personType]: 'scanning',
      }));

      setFingerprintMessage((prev) => ({
        ...prev,
        [personType]: 'Scanner ready. Place finger on DigitalPersona reader...',
      }));

      await checkFingerprintAgent();

      setFingerprintMessage((prev) => ({
        ...prev,
        [personType]: 'Place the required finger on the scanner...',
      }));

      const response = await fetch('http://127.0.0.1:9000/fingerprint/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purpose: personType }),
      });

      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error('Fingerprint agent returned an invalid response.');
      }

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Fingerprint capture failed.');
      }

      if (!data.fmd || !data.image || !data.capturedAt) {
        throw new Error('Fingerprint data was not fully returned by scanner.');
      }

      if (personType === 'customer') {
        setFormData((prev) => ({
          ...prev,
          fingerprintFmd: data.fmd,
          fingerprintImage: data.image,
          fingerprintCapturedAt: data.capturedAt,
        }));
      } else if (personType === 'guarantor1') {
        setFormData((prev) => ({
          ...prev,
          guarantor1: {
            ...prev.guarantor1,
            fingerprintFmd: data.fmd,
            fingerprintImage: data.image,
            fingerprintCapturedAt: data.capturedAt,
          },
        }));
      } else if (personType === 'guarantor2') {
        setFormData((prev) => ({
          ...prev,
          guarantor2: {
            ...prev.guarantor2,
            fingerprintFmd: data.fmd,
            fingerprintImage: data.image,
            fingerprintCapturedAt: data.capturedAt,
          },
        }));
      }

      setFingerprintStatus((prev) => ({ ...prev, [personType]: 'captured' }));
      setFingerprintMessage((prev) => ({
        ...prev,
        [personType]: 'Fingerprint captured successfully.',
      }));
    } catch (error) {
      console.error('FINGERPRINT CAPTURE ERROR:', error);
      setFingerprintStatus((prev) => ({ ...prev, [personType]: 'error' }));
      setFingerprintMessage((prev) => ({
        ...prev,
        [personType]: error.message || 'Fingerprint capture failed.',
      }));
    } finally {
      setActiveFingerprint(null);
    }
  };

  // =========================================================
  // CAMERA ENGINE (WEBCAM / DASHCAM)
  // =========================================================
  const loadCameraDevices = async () => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      throw new Error('Camera access is not supported by this browser.');
    }
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter((device) => device.kind === 'videoinput');
    setCameraDevices(videoDevices);
    return videoDevices;
  };

  const stopCamera = () => {
    const stream = cameraStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
  };

  const startCamera = async (deviceId = '') => {
    try {
      setCameraLoading(true);
      setCameraError('');
      stopCamera();

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera is not supported by this browser.');
      }

      let constraints = {
        audio: false,
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      };

      if (deviceId) {
        constraints.video.deviceId = { exact: deviceId };
      } else {
        constraints.video.facingMode = 'user';
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      cameraStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (playError) {
          console.warn('Video play error:', playError);
        }
      }

      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((device) => device.kind === 'videoinput');
        setCameraDevices(videoDevices);
      } catch (deviceError) {
        console.warn('Could not refresh camera list:', deviceError);
      }
    } catch (error) {
      console.error('START CAMERA ERROR:', error);
      let message = 'Unable to open camera.';
      if (error.name === 'NotAllowedError') {
        message = 'Camera permission denied. Allow camera access in browser.';
      } else if (error.name === 'NotFoundError') {
        message = 'No camera found. Connect your webcam or dashcam.';
      } else if (error.message) {
        message = error.message;
      }
      setCameraError(message);
      throw error;
    } finally {
      setCameraLoading(false);
    }
  };

  const openPhotoCamera = async (personType) => {
    if (activeFingerprint) {
      setErrorMsg('Please wait until fingerprint scanning is finished.');
      return;
    }

    try {
      setErrorMsg('');
      setCameraError('');
      setActiveCameraPerson(personType);
      setPhotoPreview('');

      const devices = await loadCameraDevices();
      if (!devices || devices.length === 0) {
        throw new Error('No camera detected.');
      }

      const selectedStillExists =
        selectedCamera &&
        devices.some((device) => device.deviceId === selectedCamera);

      const cameraId = selectedStillExists ? selectedCamera : devices[0].deviceId;
      setSelectedCamera(cameraId);
      setCameraOpen(true);

      await new Promise((resolve) => setTimeout(resolve, 100));
      await startCamera(cameraId);
    } catch (error) {
      stopCamera();
      setCameraOpen(false);
      setActiveCameraPerson(null);
      setCameraError(error.message || 'Unable to open camera.');
    }
  };

  const handleCameraChange = async (e) => {
    const deviceId = e.target.value;
    setSelectedCamera(deviceId);
    setCameraError('');
    setPhotoPreview('');

    if (cameraOpen && deviceId) {
      try {
        await startCamera(deviceId);
      } catch (error) {
        console.error(error);
      }
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const originalWidth = video.videoWidth;
    const originalHeight = video.videoHeight;
    const MAX_DIMENSION = 1280;
    const scale = Math.min(1, MAX_DIMENSION / Math.max(originalWidth, originalHeight));
    const width = Math.round(originalWidth * scale);
    const height = Math.round(originalHeight * scale);

    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return;

    context.save();
    context.translate(width, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0, width, height);
    context.restore();

    const imageData = canvas.toDataURL('image/jpeg', 0.85);
    setPhotoPreview(imageData);
    setCameraError('');
  };

  const retakePhoto = async () => {
    setPhotoPreview('');
    setCameraError('');
    await new Promise((resolve) => setTimeout(resolve, 50));
    if (cameraStreamRef.current && videoRef.current) {
      videoRef.current.srcObject = cameraStreamRef.current;
      try {
        await videoRef.current.play();
      } catch (error) {
        console.warn(error);
      }
    } else {
      await startCamera(selectedCamera);
    }
  };

  const saveCapturedPhoto = () => {
    if (!photoPreview || !activeCameraPerson) return;
    const capturedAt = new Date().toISOString();

    if (activeCameraPerson === 'customer') {
      setFormData((prev) => ({
        ...prev,
        liveImage: photoPreview,
        liveImageCapturedAt: capturedAt,
      }));
    } else if (activeCameraPerson === 'guarantor1') {
      setFormData((prev) => ({
        ...prev,
        guarantor1: {
          ...prev.guarantor1,
          liveImage: photoPreview,
          liveImageCapturedAt: capturedAt,
        },
      }));
    } else if (activeCameraPerson === 'guarantor2') {
      setFormData((prev) => ({
        ...prev,
        guarantor2: {
          ...prev.guarantor2,
          liveImage: photoPreview,
          liveImageCapturedAt: capturedAt,
        },
      }));
    }
    closeCamera();
  };

  const closeCamera = () => {
    stopCamera();
    setCameraOpen(false);
    setActiveCameraPerson(null);
    setPhotoPreview('');
    setCameraError('');
    setCameraLoading(false);
  };

  useEffect(() => {
    return () => {
      const stream = cameraStreamRef.current;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // =========================================================
  // FORM VALIDATION & SUBMIT
  // =========================================================
  const validatePakistaniMobile = (number) => {
    const cleaned = String(number || '').replace(/\s+/g, '');
    const regex = /^(03\d{9}|\+923\d{9}|923\d{9})$/;
    return regex.test(cleaned);
  };

  const validateCNIC = (cnic) => {
    const cleaned = String(cnic || '').replace(/-/g, '').trim();
    return cleaned.length === 13 && /^\d+$/.test(cleaned);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!validatePakistaniMobile(formData.mobileNumber)) {
      setErrorMsg('Please enter a valid Pakistani mobile number (e.g. 03001234567).');
      return;
    }

    if (
      formData.alternateMobileNumber &&
      !validatePakistaniMobile(formData.alternateMobileNumber)
    ) {
      setErrorMsg('Alternate mobile number is invalid.');
      return;
    }

    if (!validateCNIC(formData.cnic)) {
      setErrorMsg('CNIC must be a valid 13-digit Pakistani ID card format (e.g. 35401-1234567-1).');
      return;
    }

    if (
      formData.guarantor1?.mobileNumber &&
      !validatePakistaniMobile(formData.guarantor1.mobileNumber)
    ) {
      setErrorMsg('Zamanti 1 mobile number is invalid.');
      return;
    }

    if (formData.guarantor1?.cnic && !validateCNIC(formData.guarantor1.cnic)) {
      setErrorMsg('Zamanti 1 CNIC is invalid.');
      return;
    }

    if (
      formData.guarantor2?.mobileNumber &&
      !validatePakistaniMobile(formData.guarantor2.mobileNumber)
    ) {
      setErrorMsg('Zamanti 2 mobile number is invalid.');
      return;
    }

    if (formData.guarantor2?.cnic && !validateCNIC(formData.guarantor2.cnic)) {
      setErrorMsg('Zamanti 2 CNIC is invalid.');
      return;
    }

    const payload = {
      ...formData,
      guarantor1: { ...formData.guarantor1 },
      guarantor2: { ...formData.guarantor2 },
    };

    try {
      setLoading(true);
      if (isEditMode) {
        await api.put(`/customers/${id}`, payload);
        toast.success('Customer profile updated successfully!');
      } else {
        await api.post('/customers', payload);
        toast.success('New customer registered successfully!');
      }
      navigate('/customers');
    } catch (error) {
      console.error('SAVE CUSTOMER ERROR:', error);
      setErrorMsg(
        error.response?.data?.message ||
          error.message ||
          'Failed to submit customer credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // FINGERPRINT + PHOTO BUTTON COMPONENT
  // =========================================================
  const FingerprintButton = ({ personType, label, required = false }) => {
    const status = fingerprintStatus[personType];
    const message = fingerprintMessage[personType];
    const isScanning = status === 'scanning';
    const isCaptured = status === 'captured';
    const isError = status === 'error';

    let fingerprintImage = '';
    let fingerprintCapturedAt = null;
    let liveImage = '';
    let liveImageCapturedAt = null;

    if (personType === 'customer') {
      fingerprintImage = formData.fingerprintImage || '';
      fingerprintCapturedAt = formData.fingerprintCapturedAt || null;
      liveImage = formData.liveImage || '';
      liveImageCapturedAt = formData.liveImageCapturedAt || null;
    } else if (personType === 'guarantor1') {
      fingerprintImage = formData.guarantor1?.fingerprintImage || '';
      fingerprintCapturedAt = formData.guarantor1?.fingerprintCapturedAt || null;
      liveImage = formData.guarantor1?.liveImage || '';
      liveImageCapturedAt = formData.guarantor1?.liveImageCapturedAt || null;
    } else if (personType === 'guarantor2') {
      fingerprintImage = formData.guarantor2?.fingerprintImage || '';
      fingerprintCapturedAt = formData.guarantor2?.fingerprintCapturedAt || null;
      liveImage = formData.guarantor2?.liveImage || '';
      liveImageCapturedAt = formData.guarantor2?.liveImageCapturedAt || null;
    }

    return (
      <div className="mt-5 border border-slate-200/80 rounded-3xl p-5 bg-slate-50/70 space-y-4">
        
        {/* FINGERPRINT ACTION ROW */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                isCaptured
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : isError
                  ? 'bg-rose-50 border-rose-200 text-rose-700'
                  : 'bg-indigo-50 border-indigo-200 text-indigo-700'
              }`}
            >
              {isCaptured ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <Fingerprint className="w-5 h-5" />
              )}
            </div>

            <div>
              <p className="text-xs font-black text-slate-900">
                {label} Biometric Fingerprint
                {required && <span className="text-rose-500 ml-1">*</span>}
              </p>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                {message || 'DigitalPersona U.are.U 4500 USB Reader'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => captureFingerprint(personType)}
            disabled={isScanning || !!activeFingerprint || cameraOpen}
            className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all shadow-sm ${
              isCaptured
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95 text-white'
            } disabled:opacity-50`}
          >
            {isScanning ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Scanning Finger...</span>
              </>
            ) : isCaptured ? (
              <>
                <ScanLine className="w-3.5 h-3.5" />
                <span>Re-scan Fingerprint</span>
              </>
            ) : (
              <>
                <Fingerprint className="w-3.5 h-3.5" />
                <span>Capture Fingerprint</span>
              </>
            )}
          </button>
        </div>

        {/* FINGERPRINT PREVIEW CARD */}
        {isCaptured && fingerprintImage && (
          <div className="p-3.5 rounded-2xl bg-white border border-emerald-200 flex items-center gap-4 animate-[pageEnter_0.2s_ease-out]">
            <div className="w-20 h-24 rounded-xl border border-slate-200 bg-slate-50 p-1 flex items-center justify-center shrink-0">
              <img
                src={getImageSource(fingerprintImage)}
                alt={`${label} biometric`}
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <span className="text-[9px] uppercase font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                Biometric Template Saved
              </span>
              <p className="text-xs font-black text-slate-800 mt-1">DigitalPersona 4500 Verified</p>
              {fingerprintCapturedAt && (
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                  Captured: {formatCaptureDateTime(fingerprintCapturedAt)}
                </p>
              )}
            </div>
          </div>
        )}

        {/* LIVE PHOTO ACTION ROW */}
        <div className="pt-3.5 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                liveImage
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-blue-50 border-blue-200 text-blue-700'
              }`}
            >
              {liveImage ? <CheckCircle2 className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
            </div>

            <div>
              <p className="text-xs font-black text-slate-900">
                {label} Live Camera Photo
                {required && <span className="text-rose-500 ml-1">*</span>}
              </p>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                Webcam / External USB Dashcam photo recording
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => openPhotoCamera(personType)}
            disabled={!!activeFingerprint || cameraLoading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-black bg-slate-900 hover:bg-slate-800 text-white transition-all shadow-sm disabled:opacity-50"
          >
            {cameraLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Starting Camera...</span>
              </>
            ) : liveImage ? (
              <>
                <Camera className="w-3.5 h-3.5" />
                <span>Retake Photo</span>
              </>
            ) : (
              <>
                <Camera className="w-3.5 h-3.5" />
                <span>Open Camera</span>
              </>
            )}
          </button>
        </div>

        {/* LIVE PHOTO PREVIEW CARD */}
        {liveImage && (
          <div className="p-3.5 rounded-2xl bg-white border border-blue-200 flex items-center gap-4 animate-[pageEnter_0.2s_ease-out]">
            <div className="w-24 h-24 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden shrink-0">
              <img
                src={getImageSource(liveImage)}
                alt={`${label} live`}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <span className="text-[9px] uppercase font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                Live Photo Stored
              </span>
              <p className="text-xs font-black text-slate-800 mt-1">Identity Verification Attached</p>
              {liveImageCapturedAt && (
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                  Captured: {formatCaptureDateTime(liveImageCapturedAt)}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // =========================================================
  // LOADING STATE
  // =========================================================
  if (fetching) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="relative mx-auto w-16 h-16">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 animate-pulse opacity-25" />
            <div className="relative w-16 h-16 rounded-2xl bg-slate-950 border border-white/10 shadow-2xl flex items-center justify-center">
              <Loader2 className="w-7 h-7 text-blue-400 animate-spin" />
            </div>
          </div>
          <h3 className="mt-5 text-sm font-black uppercase tracking-[0.16em] text-slate-800">
            Querying Customer Profile
          </h3>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            Loading identity and biometric templates...
          </p>
        </div>
      </div>
    );
  }

  // =========================================================
  // MAIN FORM RENDER
  // =========================================================
  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-[pageEnter_0.45s_cubic-bezier(0.16,1,0.3,1)]">
      
      {/* =====================================================
          DARK HERO HEADER
      ====================================================== */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#080d1b] via-[#0b1020] to-[#060913] border border-white/[0.08] shadow-2xl shadow-blue-950/20 text-white">
        <div className="pointer-events-none absolute -top-32 -left-20 w-80 h-80 rounded-full bg-blue-600/20 blur-3xl animate-pulse" />
        <div className="pointer-events-none absolute -bottom-32 right-10 w-96 h-96 rounded-full bg-violet-600/20 blur-3xl" />

        <div className="relative z-10 p-5 sm:p-7">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            
            <div className="flex items-center gap-3.5">
              <Link
                to="/customers"
                className="w-11 h-11 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.1] text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 shrink-0"
                title="Back to Customers Directory"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-400/20 text-[9px] font-black uppercase tracking-[0.16em] text-blue-300">
                    <Sparkles className="w-2.5 h-2.5 text-blue-400" />
                    Customer Registration
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="text-[9px] font-bold text-slate-400">
                    {isEditMode ? 'Modify Account' : 'New Customer Entry'}
                  </span>
                </div>

                <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white">
                  {isEditMode ? 'Modify Customer Profile' : 'Register Customer & 2 Zamanatdaar'}
                </h1>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ERROR ALERT */}
      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex items-start gap-3 text-rose-800 animate-[pageEnter_0.2s_ease-out]">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-rose-600">Verification Error</p>
            <p className="text-xs font-bold mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* FORM */}
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* ===================================================
            SECTION 1: PRIMARY CUSTOMER PROFILE
        =================================================== */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-7 shadow-sm space-y-6">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">Primary Customer Identification</h3>
              <p className="text-[10px] text-slate-400 font-semibold">National ID, contact numbers & residential address</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="e.g. Muhammad Rizwan"
                className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs sm:text-sm font-bold bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                Father's Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="fatherName"
                value={formData.fatherName}
                onChange={handleChange}
                placeholder="e.g. Abdul Ghafoor"
                className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs sm:text-sm font-bold bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                CNIC Number (13 Digits) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="cnic"
                value={formData.cnic}
                onChange={handleChange}
                placeholder="35401-1234567-1"
                maxLength={15}
                className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs sm:text-sm font-bold tracking-wider bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                Primary Mobile Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="mobileNumber"
                value={formData.mobileNumber}
                onChange={handleChange}
                placeholder="03001234567"
                className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs sm:text-sm font-bold bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                Alternate Mobile Number
              </label>
              <input
                type="text"
                name="alternateMobileNumber"
                value={formData.alternateMobileNumber}
                onChange={handleChange}
                placeholder="03007654321"
                className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs sm:text-sm font-medium bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                City / Town <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs sm:text-sm font-bold bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                required
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                Residential Home Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Street / Mohalla / Village complete details..."
                className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs sm:text-sm font-medium bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                required
              />
            </div>
          </div>

          <FingerprintButton personType="customer" label="Customer" />
        </div>

        {/* ===================================================
            SECTION 2: ZAMANATDAR 1 (PRIMARY GUARANTOR)
        =================================================== */}
        <div className="bg-white border border-purple-200/80 rounded-3xl p-5 sm:p-7 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-purple-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-purple-900">Zamanatdar 1 (Primary Guarantor)</h3>
                <p className="text-[10px] text-purple-500 font-semibold">Optional recovery surety verification</p>
              </div>
            </div>

            <span className="px-2.5 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-[10px] font-black">
              Primary Guarantor
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                Zamanti 1 Name
              </label>
              <input
                type="text"
                value={formData.guarantor1?.name || ''}
                onChange={(e) => handleGuarantorChange('guarantor1', 'name', e.target.value)}
                placeholder="Full Name"
                className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs sm:text-sm font-bold bg-slate-50 focus:bg-white focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                Father Name
              </label>
              <input
                type="text"
                value={formData.guarantor1?.fatherName || ''}
                onChange={(e) => handleGuarantorChange('guarantor1', 'fatherName', e.target.value)}
                placeholder="Father Name"
                className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs sm:text-sm font-bold bg-slate-50 focus:bg-white focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                Mobile Number
              </label>
              <input
                type="text"
                value={formData.guarantor1?.mobileNumber || ''}
                onChange={(e) => handleGuarantorChange('guarantor1', 'mobileNumber', e.target.value)}
                placeholder="03001234567"
                className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs sm:text-sm font-bold bg-slate-50 focus:bg-white focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                CNIC Number
              </label>
              <input
                type="text"
                value={formData.guarantor1?.cnic || ''}
                onChange={(e) => handleGuarantorChange('guarantor1', 'cnic', e.target.value)}
                placeholder="35401-..."
                maxLength={15}
                className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs sm:text-sm font-bold tracking-wider bg-slate-50 focus:bg-white focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                Relationship with Customer
              </label>
              <input
                type="text"
                value={formData.guarantor1?.relation || ''}
                onChange={(e) => handleGuarantorChange('guarantor1', 'relation', e.target.value)}
                placeholder="e.g. Brother, Friend, Uncle"
                className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs sm:text-sm font-medium bg-slate-50 focus:bg-white focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                Residential Address
              </label>
              <input
                type="text"
                value={formData.guarantor1?.address || ''}
                onChange={(e) => handleGuarantorChange('guarantor1', 'address', e.target.value)}
                placeholder="Area / Village / City"
                className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs sm:text-sm font-medium bg-slate-50 focus:bg-white focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all"
              />
            </div>
          </div>

          <FingerprintButton personType="guarantor1" label="Zamanti 1" />
        </div>

        {/* ===================================================
            SECTION 3: ZAMANATDAR 2 (SECONDARY GUARANTOR)
        =================================================== */}
        <div className="bg-white border border-indigo-200/80 rounded-3xl p-5 sm:p-7 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-indigo-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-indigo-900">Zamanatdar 2 (Secondary Guarantor)</h3>
                <p className="text-[10px] text-indigo-500 font-semibold">Optional backup surety verification</p>
              </div>
            </div>

            <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-black">
              Secondary Guarantor
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                Zamanti 2 Name
              </label>
              <input
                type="text"
                value={formData.guarantor2?.name || ''}
                onChange={(e) => handleGuarantorChange('guarantor2', 'name', e.target.value)}
                placeholder="Full Name"
                className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs sm:text-sm font-bold bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                Father Name
              </label>
              <input
                type="text"
                value={formData.guarantor2?.fatherName || ''}
                onChange={(e) => handleGuarantorChange('guarantor2', 'fatherName', e.target.value)}
                placeholder="Father Name"
                className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs sm:text-sm font-bold bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                Mobile Number
              </label>
              <input
                type="text"
                value={formData.guarantor2?.mobileNumber || ''}
                onChange={(e) => handleGuarantorChange('guarantor2', 'mobileNumber', e.target.value)}
                placeholder="03001234567"
                className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs sm:text-sm font-bold bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                CNIC Number
              </label>
              <input
                type="text"
                value={formData.guarantor2?.cnic || ''}
                onChange={(e) => handleGuarantorChange('guarantor2', 'cnic', e.target.value)}
                placeholder="35401-..."
                maxLength={15}
                className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs sm:text-sm font-bold tracking-wider bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                Relationship with Customer
              </label>
              <input
                type="text"
                value={formData.guarantor2?.relation || ''}
                onChange={(e) => handleGuarantorChange('guarantor2', 'relation', e.target.value)}
                placeholder="e.g. Neighbor, Cousin, Friend"
                className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs sm:text-sm font-medium bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                Residential Address
              </label>
              <input
                type="text"
                value={formData.guarantor2?.address || ''}
                onChange={(e) => handleGuarantorChange('guarantor2', 'address', e.target.value)}
                placeholder="Area / Village / City"
                className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs sm:text-sm font-medium bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
              />
            </div>
          </div>

          <FingerprintButton personType="guarantor2" label="Zamanti 2" />
        </div>

        {/* SUBMIT BUTTON BAR */}
        <div className="flex items-center justify-between p-4 sm:p-5 bg-white border border-slate-200/80 rounded-3xl shadow-sm">
          <Link
            to="/customers"
            className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-xs font-black text-slate-600 transition-all"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={loading || !!activeFingerprint || cameraOpen}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:opacity-95 text-white font-black text-xs shadow-lg shadow-blue-950/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Credentials...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>
                  {isEditMode ? 'Update Profile & Guarantors' : 'Save Customer & 2 Zamanti'}
                </span>
              </>
            )}
          </button>
        </div>

      </form>

      {/* =====================================================
          LIVE CAMERA MODAL
      ====================================================== */}
      {cameraOpen && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md p-4 flex items-center justify-center animate-[pageEnter_0.25s_ease-out]">
          <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
            
            {/* Camera Modal Header */}
            <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-white">
                    Record{' '}
                    {activeCameraPerson === 'customer'
                      ? 'Customer'
                      : activeCameraPerson === 'guarantor1'
                      ? 'Zamanti 1'
                      : 'Zamanti 2'}{' '}
                    Photo
                  </h3>
                  <p className="text-[10px] text-slate-400">Position the person clearly in front of camera</p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeCamera}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Camera Device Selector */}
            <div className="px-5 pt-4">
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                Select Connected Camera
              </label>
              <select
                value={selectedCamera}
                onChange={handleCameraChange}
                disabled={cameraLoading}
                className="w-full h-11 border border-slate-200 rounded-xl px-3.5 text-xs font-bold bg-slate-50 focus:bg-white cursor-pointer"
              >
                {cameraDevices.length === 0 ? (
                  <option value="">No camera detected</option>
                ) : (
                  cameraDevices.map((device, index) => (
                    <option key={device.deviceId || index} value={device.deviceId}>
                      {device.label || `Camera ${index + 1}`}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Camera Error Message */}
            {cameraError && (
              <div className="mx-5 mt-3 bg-rose-50 border border-rose-200 p-3 rounded-2xl flex items-start gap-2">
                <CameraOff className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <p className="text-xs font-bold text-rose-700">{cameraError}</p>
              </div>
            )}

            {/* Video / Snapshot Viewfinder */}
            <div className="p-5 flex-1 flex flex-col justify-center">
              <div className="relative w-full bg-slate-950 rounded-2xl overflow-hidden aspect-video flex items-center justify-center shadow-inner">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className={`w-full h-full object-contain ${
                    photoPreview ? 'invisible' : 'visible'
                  }`}
                  style={{ transform: 'scaleX(-1)' }}
                />

                {photoPreview && (
                  <img
                    src={photoPreview}
                    alt="Snapshot preview"
                    className="absolute inset-0 w-full h-full object-contain"
                  />
                )}

                {cameraLoading && !photoPreview && (
                  <div className="absolute inset-0 bg-slate-950/70 flex flex-col items-center justify-center text-white">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                    <p className="text-xs font-bold mt-2">Connecting camera...</p>
                  </div>
                )}
              </div>
              <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Modal Controls */}
            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={closeCamera}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-xs font-black text-slate-600"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                {!photoPreview ? (
                  <button
                    type="button"
                    onClick={capturePhoto}
                    disabled={cameraLoading}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-xs shadow-md hover:opacity-95"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Capture Photo</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={retakePhoto}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-black text-xs hover:bg-slate-100"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Retake</span>
                    </button>

                    <button
                      type="button"
                      onClick={saveCapturedPhoto}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Use This Photo</span>
                    </button>
                  </>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default AddEditCustomer;