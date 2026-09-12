import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
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

  const [activeFingerprint, setActiveFingerprint] =
    useState(null);

  // =========================================================
  // CAMERA STATES
  // =========================================================

  const [cameraOpen, setCameraOpen] = useState(false);
  const [activeCameraPerson, setActiveCameraPerson] =
    useState(null);

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

      if (Number.isNaN(date.getTime())) {
        return '';
      }

      return date.toLocaleString('en-PK', {
        dateStyle: 'medium',
        timeStyle: 'medium',
      });
    } catch {
      return '';
    }
  };

  // =========================================================
  // IMAGE SOURCE
  // =========================================================

  const getImageSource = (image) => {
    if (!image || typeof image !== 'string') {
      return '';
    }

    if (
      image.startsWith('data:image/')
    ) {
      return image;
    }

    if (
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
    if (!isEditMode) {
      return;
    }

    const fetchCustomerDetails = async () => {
      try {
        setFetching(true);
        setErrorMsg('');

        // IMPORTANT:
        // api.js already has /api in baseURL.
        const response = await api.get(
          `/customers/${id}`
        );

        if (
          !response.data ||
          !response.data.success
        ) {
          throw new Error(
            response.data?.message ||
              'Customer details could not be loaded.'
          );
        }

        const data = response.data.data;

        const guarantor1 = {
          ...EMPTY_GUARANTOR,
          ...(data.guarantor1 || {}),

          fingerprintFmd:
            data.guarantor1?.fingerprintFmd || '',

          fingerprintImage:
            data.guarantor1?.fingerprintImage || '',

          fingerprintCapturedAt:
            data.guarantor1?.fingerprintCapturedAt ||
            null,

          liveImage:
            data.guarantor1?.liveImage || '',

          liveImageCapturedAt:
            data.guarantor1?.liveImageCapturedAt ||
            null,
        };

        const guarantor2 = {
          ...EMPTY_GUARANTOR,
          ...(data.guarantor2 || {}),

          fingerprintFmd:
            data.guarantor2?.fingerprintFmd || '',

          fingerprintImage:
            data.guarantor2?.fingerprintImage || '',

          fingerprintCapturedAt:
            data.guarantor2?.fingerprintCapturedAt ||
            null,

          liveImage:
            data.guarantor2?.liveImage || '',

          liveImageCapturedAt:
            data.guarantor2?.liveImageCapturedAt ||
            null,
        };

        setFormData({
          fullName: data.fullName || '',
          fatherName: data.fatherName || '',
          mobileNumber: data.mobileNumber || '',
          alternateMobileNumber:
            data.alternateMobileNumber || '',
          cnic: data.cnic || '',
          address: data.address || '',
          city: data.city || 'Sangla Hill',
          email: data.email || '',
          notes: data.notes || '',

          fingerprintFmd:
            data.fingerprintFmd || '',

          fingerprintImage:
            data.fingerprintImage || '',

          fingerprintCapturedAt:
            data.fingerprintCapturedAt || null,

          liveImage:
            data.liveImage || '',

          liveImageCapturedAt:
            data.liveImageCapturedAt || null,

          guarantor1,

          guarantor2,
        });

        setFingerprintStatus({
          customer: data.fingerprintFmd
            ? 'captured'
            : 'idle',

          guarantor1:
            guarantor1.fingerprintFmd
              ? 'captured'
              : 'idle',

          guarantor2:
            guarantor2.fingerprintFmd
              ? 'captured'
              : 'idle',
        });

        setFingerprintMessage({
          customer: data.fingerprintFmd
            ? 'Fingerprint already captured.'
            : '',

          guarantor1:
            guarantor1.fingerprintFmd
              ? 'Fingerprint already captured.'
              : '',

          guarantor2:
            guarantor2.fingerprintFmd
              ? 'Fingerprint already captured.'
              : '',
        });
      } catch (error) {
        console.error(
          'FETCH CUSTOMER ERROR:',
          error
        );

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
  // NORMAL INPUT
  // =========================================================

  const handleChange = (e) => {
    let { name, value } = e.target;

    if (name === 'cnic') {
      value = value.replace(/[^0-9]/g, '');

      if (value.length > 5 && value.length <= 12) {
        value =
          `${value.slice(0, 5)}-${value.slice(5)}`;
      } else if (value.length > 12) {
        value =
          `${value.slice(0, 5)}-${value.slice(5, 12)}-${value.slice(12, 13)}`;
      }
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // =========================================================
  // GUARANTOR INPUT
  // =========================================================

  const handleGuarantorChange = (
    guarantorKey,
    field,
    val
  ) => {
    let value = val;

    if (field === 'cnic') {
      value = value.replace(/[^0-9]/g, '');

      if (value.length > 5 && value.length <= 12) {
        value =
          `${value.slice(0, 5)}-${value.slice(5)}`;
      } else if (value.length > 12) {
        value =
          `${value.slice(0, 5)}-${value.slice(5, 12)}-${value.slice(12, 13)}`;
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
  // FINGERPRINT AGENT HEALTH
  // =========================================================

  const checkFingerprintAgent = async () => {
    try {
      const response = await fetch(
        'http://127.0.0.1:9000/health',
        {
          method: 'GET',
        }
      );

      if (!response.ok) {
        throw new Error(
          'Fingerprint agent unavailable.'
        );
      }

      const data = await response.json();

      if (
        !data.success ||
        !data.readerConnected
      ) {
        throw new Error(
          'Fingerprint reader is not connected.'
        );
      }

      return true;
    } catch (error) {
      console.error(
        'FINGERPRINT HEALTH ERROR:',
        error
      );

      throw new Error(
        'Fingerprint scanner agent is not running or DigitalPersona reader is not connected.'
      );
    }
  };

  // =========================================================
  // CAPTURE FINGERPRINT
  // =========================================================

  const captureFingerprint = async (
    personType
  ) => {
    if (activeFingerprint) {
      return;
    }

    try {
      setErrorMsg('');
      setActiveFingerprint(personType);

      setFingerprintStatus((prev) => ({
        ...prev,
        [personType]: 'scanning',
      }));

      setFingerprintMessage((prev) => ({
        ...prev,
        [personType]:
          'Scanner ready. Place finger on DigitalPersona reader...',
      }));

      await checkFingerprintAgent();

      setFingerprintMessage((prev) => ({
        ...prev,
        [personType]:
          'Place the required finger on the scanner...',
      }));

      const response = await fetch(
        'http://127.0.0.1:9000/fingerprint/capture',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            purpose: personType,
          }),
        }
      );

      let data;

      try {
        data = await response.json();
      } catch {
        throw new Error(
          'Fingerprint agent returned an invalid response.'
        );
      }

      console.log(
        'FINGERPRINT AGENT RESPONSE:',
        data
      );

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            'Fingerprint capture failed.'
        );
      }

      if (!data.fmd) {
        throw new Error(
          'Fingerprint template was not returned by scanner.'
        );
      }

      if (!data.image) {
        throw new Error(
          'Fingerprint image was not returned by scanner.'
        );
      }

      if (!data.capturedAt) {
        throw new Error(
          'Fingerprint capture date/time was not returned by scanner.'
        );
      }

      // CUSTOMER
      if (personType === 'customer') {
        setFormData((prev) => ({
          ...prev,

          fingerprintFmd: data.fmd,
          fingerprintImage: data.image,
          fingerprintCapturedAt:
            data.capturedAt,
        }));
      }

      // GUARANTOR 1
      if (personType === 'guarantor1') {
        setFormData((prev) => ({
          ...prev,

          guarantor1: {
            ...prev.guarantor1,

            fingerprintFmd: data.fmd,
            fingerprintImage: data.image,
            fingerprintCapturedAt:
              data.capturedAt,
          },
        }));
      }

      // GUARANTOR 2
      if (personType === 'guarantor2') {
        setFormData((prev) => ({
          ...prev,

          guarantor2: {
            ...prev.guarantor2,

            fingerprintFmd: data.fmd,
            fingerprintImage: data.image,
            fingerprintCapturedAt:
              data.capturedAt,
          },
        }));
      }

      setFingerprintStatus((prev) => ({
        ...prev,
        [personType]: 'captured',
      }));

      setFingerprintMessage((prev) => ({
        ...prev,
        [personType]:
          'Fingerprint captured successfully.',
      }));
    } catch (error) {
      console.error(
        'FINGERPRINT CAPTURE ERROR:',
        error
      );

      setFingerprintStatus((prev) => ({
        ...prev,
        [personType]: 'error',
      }));

      setFingerprintMessage((prev) => ({
        ...prev,
        [personType]:
          error.message ||
          'Fingerprint capture failed.',
      }));
    } finally {
      setActiveFingerprint(null);
    }
  };

  // =========================================================
  // CAMERA DEVICES
  // =========================================================

  const loadCameraDevices = async () => {
    if (
      !navigator.mediaDevices?.enumerateDevices
    ) {
      throw new Error(
        'Camera access is not supported by this browser.'
      );
    }

    const devices =
      await navigator.mediaDevices.enumerateDevices();

    const videoDevices = devices.filter(
      (device) =>
        device.kind === 'videoinput'
    );

    setCameraDevices(videoDevices);

    return videoDevices;
  };

  // =========================================================
  // STOP CAMERA
  // =========================================================

  const stopCamera = () => {
    const stream =
      cameraStreamRef.current;

    if (stream) {
      stream
        .getTracks()
        .forEach((track) => track.stop());

      cameraStreamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
  };

  // =========================================================
  // START CAMERA
  // =========================================================

  const startCamera = async (
    deviceId = ''
  ) => {
    try {
      setCameraLoading(true);
      setCameraError('');

      stopCamera();

      if (
        !navigator.mediaDevices?.getUserMedia
      ) {
        throw new Error(
          'Camera is not supported by this browser.'
        );
      }

      let constraints = {
        audio: false,

        video: {
          width: {
            ideal: 1280,
          },

          height: {
            ideal: 720,
          },
        },
      };

      if (deviceId) {
        constraints.video.deviceId = {
          exact: deviceId,
        };
      } else {
        constraints.video.facingMode = 'user';
      }

      const stream =
        await navigator.mediaDevices.getUserMedia(
          constraints
        );

      cameraStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject =
          stream;

        try {
          await videoRef.current.play();
        } catch (playError) {
          console.warn(
            'Video autoplay/play warning:',
            playError
          );
        }
      }

      // Refresh camera list after permission
      try {
        const devices =
          await navigator.mediaDevices.enumerateDevices();

        const videoDevices =
          devices.filter(
            (device) =>
              device.kind === 'videoinput'
          );

        setCameraDevices(videoDevices);

        // If selected device disappeared,
        // choose first available device.
        if (
          selectedCamera &&
          !videoDevices.some(
            (device) =>
              device.deviceId ===
              selectedCamera
          )
        ) {
          if (videoDevices[0]) {
            setSelectedCamera(
              videoDevices[0].deviceId
            );
          }
        }
      } catch (deviceError) {
        console.warn(
          'Could not refresh camera list:',
          deviceError
        );
      }
    } catch (error) {
      console.error(
        'START CAMERA ERROR:',
        error
      );

      let message =
        'Unable to open camera.';

      if (
        error.name === 'NotAllowedError'
      ) {
        message =
          'Camera permission was denied. Please allow camera access in the browser.';
      } else if (
        error.name === 'NotFoundError'
      ) {
        message =
          'No camera was found. Make sure your dashcam/webcam is connected and detected by Windows.';
      } else if (
        error.name === 'NotReadableError'
      ) {
        message =
          'Camera is already being used by another application.';
      } else if (
        error.name === 'OverconstrainedError'
      ) {
        message =
          'Selected camera could not be opened. Try another camera.';
      } else if (error.message) {
        message = error.message;
      }

      setCameraError(message);

      throw error;
    } finally {
      setCameraLoading(false);
    }
  };

  // =========================================================
  // OPEN PHOTO CAMERA
  // =========================================================

  const openPhotoCamera = async (
    personType
  ) => {
    if (activeFingerprint) {
      setErrorMsg(
        'Please wait until fingerprint scanning is finished.'
      );
      return;
    }

    try {
      setErrorMsg('');
      setCameraError('');
      setActiveCameraPerson(personType);
      setPhotoPreview('');

      const devices =
        await loadCameraDevices();

      if (
        !devices ||
        devices.length === 0
      ) {
        throw new Error(
          'No camera was detected. Connect your dashcam/webcam and make sure Windows detects it as a camera.'
        );
      }

      // Use selected camera only if it
      // still exists.
      const selectedStillExists =
        selectedCamera &&
        devices.some(
          (device) =>
            device.deviceId ===
            selectedCamera
        );

      const cameraId =
        selectedStillExists
          ? selectedCamera
          : devices[0].deviceId;

      setSelectedCamera(cameraId);
      setCameraOpen(true);

      // Allow modal/video element to render.
      await new Promise((resolve) =>
        setTimeout(resolve, 100)
      );

      await startCamera(cameraId);
    } catch (error) {
      console.error(
        'OPEN PHOTO CAMERA ERROR:',
        error
      );

      stopCamera();

      setCameraOpen(false);
      setActiveCameraPerson(null);

      setCameraError(
        error.message ||
          'Unable to open camera.'
      );
    }
  };

  // =========================================================
  // CAMERA CHANGE
  // =========================================================

  const handleCameraChange = async (
    e
  ) => {
    const deviceId = e.target.value;

    setSelectedCamera(deviceId);
    setCameraError('');
    setPhotoPreview('');

    if (
      cameraOpen &&
      deviceId
    ) {
      try {
        await startCamera(deviceId);
      } catch (error) {
        console.error(error);
      }
    }
  };

  // =========================================================
  // CAPTURE PHOTO
  // =========================================================

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      setCameraError(
        'Camera is not ready yet.'
      );
      return;
    }

    if (
      video.readyState <
      HTMLMediaElement.HAVE_CURRENT_DATA
    ) {
      setCameraError(
        'Camera video is not ready. Please wait a moment.'
      );
      return;
    }

    if (
      !video.videoWidth ||
      !video.videoHeight
    ) {
      setCameraError(
        'Camera has not provided a video frame yet. Please wait a moment.'
      );
      return;
    }

    const originalWidth =
      video.videoWidth;

    const originalHeight =
      video.videoHeight;

    const MAX_DIMENSION = 1280;

    const scale = Math.min(
      1,
      MAX_DIMENSION /
        Math.max(
          originalWidth,
          originalHeight
        )
    );

    const width = Math.round(
      originalWidth * scale
    );

    const height = Math.round(
      originalHeight * scale
    );

    canvas.width = width;
    canvas.height = height;

    const context =
      canvas.getContext('2d');

    if (!context) {
      setCameraError(
        'Unable to capture photo.'
      );
      return;
    }

    // Mirror captured image because
    // live camera preview is mirrored.
    context.save();

    context.translate(width, 0);
    context.scale(-1, 1);

    context.drawImage(
      video,
      0,
      0,
      width,
      height
    );

    context.restore();

    const imageData =
      canvas.toDataURL(
        'image/jpeg',
        0.82
      );

    if (!imageData) {
      setCameraError(
        'Photo could not be generated.'
      );
      return;
    }

    setPhotoPreview(imageData);
    setCameraError('');
  };

  // =========================================================
  // RETAKE PHOTO
  // =========================================================

  const retakePhoto = async () => {
    setPhotoPreview('');
    setCameraError('');

    // Video remains mounted now, so
    // retake works correctly.
    await new Promise((resolve) =>
      setTimeout(resolve, 50)
    );

    if (
      cameraStreamRef.current &&
      videoRef.current
    ) {
      videoRef.current.srcObject =
        cameraStreamRef.current;

      try {
        await videoRef.current.play();
      } catch (error) {
        console.warn(
          'Could not restart video:',
          error
        );
      }
    } else {
      try {
        await startCamera(
          selectedCamera
        );
      } catch (error) {
        console.error(error);
      }
    }
  };

  // =========================================================
  // SAVE CAPTURED PHOTO
  // =========================================================

  const saveCapturedPhoto = () => {
    if (
      !photoPreview ||
      !activeCameraPerson
    ) {
      return;
    }

    const capturedAt =
      new Date().toISOString();

    // CUSTOMER
    if (
      activeCameraPerson ===
      'customer'
    ) {
      setFormData((prev) => ({
        ...prev,

        // IMPORTANT:
        // Backend schema uses liveImage.
        liveImage: photoPreview,

        liveImageCapturedAt:
          capturedAt,
      }));
    }

    // GUARANTOR 1
    if (
      activeCameraPerson ===
      'guarantor1'
    ) {
      setFormData((prev) => ({
        ...prev,

        guarantor1: {
          ...prev.guarantor1,

          liveImage: photoPreview,

          liveImageCapturedAt:
            capturedAt,
        },
      }));
    }

    // GUARANTOR 2
    if (
      activeCameraPerson ===
      'guarantor2'
    ) {
      setFormData((prev) => ({
        ...prev,

        guarantor2: {
          ...prev.guarantor2,

          liveImage: photoPreview,

          liveImageCapturedAt:
            capturedAt,
        },
      }));
    }

    closeCamera();
  };

  // =========================================================
  // CLOSE CAMERA
  // =========================================================

  const closeCamera = () => {
    stopCamera();

    setCameraOpen(false);
    setActiveCameraPerson(null);
    setPhotoPreview('');
    setCameraError('');
    setCameraLoading(false);
  };

  // =========================================================
  // CLEAN CAMERA ON UNMOUNT
  // =========================================================

  useEffect(() => {
    return () => {
      const stream =
        cameraStreamRef.current;

      if (stream) {
        stream
          .getTracks()
          .forEach((track) =>
            track.stop()
          );
      }
    };
  }, []);

  // =========================================================
  // VALIDATION
  // =========================================================

  const validatePakistaniMobile = (
    number
  ) => {
    const cleaned = String(number || '')
      .replace(/\s+/g, '');

    const regex =
      /^(03\d{9}|\+923\d{9}|923\d{9})$/;

    return regex.test(cleaned);
  };

  const validateCNIC = (cnic) => {
    const cleaned = String(cnic || '')
      .replace(/-/g, '')
      .trim();

    return (
      cleaned.length === 13 &&
      /^\d+$/.test(cleaned)
    );
  };

  // =========================================================
  // SUBMIT
  // =========================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setErrorMsg('');

    // =======================================================
    // CUSTOMER MOBILE
    // =======================================================

    if (
      !validatePakistaniMobile(
        formData.mobileNumber
      )
    ) {
      setErrorMsg(
        'Please enter a valid Pakistani mobile number (e.g., 03001234567).'
      );
      return;
    }

    // =======================================================
    // ALTERNATE MOBILE
    // =======================================================

    if (
      formData.alternateMobileNumber &&
      !validatePakistaniMobile(
        formData.alternateMobileNumber
      )
    ) {
      setErrorMsg(
        'Alternate mobile number is invalid.'
      );
      return;
    }

    // =======================================================
    // CUSTOMER CNIC
    // =======================================================

    if (
      !validateCNIC(formData.cnic)
    ) {
      setErrorMsg(
        'CNIC must be a valid 13-digit Pakistani ID card format (e.g., 35401-1234567-1).'
      );
      return;
    }

    // =======================================================
    // GUARANTOR 1 MOBILE
    // =======================================================

    if (
      formData.guarantor1?.mobileNumber &&
      !validatePakistaniMobile(
        formData.guarantor1.mobileNumber
      )
    ) {
      setErrorMsg(
        'Zamanti 1 mobile number is invalid.'
      );
      return;
    }

    // =======================================================
    // GUARANTOR 1 CNIC
    // =======================================================

    if (
      formData.guarantor1?.cnic &&
      !validateCNIC(
        formData.guarantor1.cnic
      )
    ) {
      setErrorMsg(
        'Zamanti 1 CNIC is invalid.'
      );
      return;
    }

    // =======================================================
    // GUARANTOR 2 MOBILE
    // =======================================================

    if (
      formData.guarantor2?.mobileNumber &&
      !validatePakistaniMobile(
        formData.guarantor2.mobileNumber
      )
    ) {
      setErrorMsg(
        'Zamanti 2 mobile number is invalid.'
      );
      return;
    }

    // =======================================================
    // GUARANTOR 2 CNIC
    // =======================================================

    if (
      formData.guarantor2?.cnic &&
      !validateCNIC(
        formData.guarantor2.cnic
      )
    ) {
      setErrorMsg(
        'Zamanti 2 CNIC is invalid.'
      );
      return;
    }

    // =======================================================
    // PREPARE PAYLOAD
    // =======================================================

    const payload = {
      ...formData,

      guarantor1: {
        ...formData.guarantor1,
      },

      guarantor2: {
        ...formData.guarantor2,
      },
    };

    // =======================================================
    // SAVE
    // =======================================================

    try {
      setLoading(true);

      console.log(
        'Saving customer with fingerprint + live photo data...'
      );

      console.log(
        'Customer fingerprint:',
        Boolean(payload.fingerprintFmd)
      );

      console.log(
        'Customer fingerprint image:',
        Boolean(payload.fingerprintImage)
      );

      console.log(
        'Customer live image:',
        Boolean(payload.liveImage)
      );

      console.log(
        'Guarantor 1 fingerprint:',
        Boolean(
          payload.guarantor1?.fingerprintFmd
        )
      );

      console.log(
        'Guarantor 1 live image:',
        Boolean(
          payload.guarantor1?.liveImage
        )
      );

      console.log(
        'Guarantor 2 fingerprint:',
        Boolean(
          payload.guarantor2?.fingerprintFmd
        )
      );

      console.log(
        'Guarantor 2 live image:',
        Boolean(
          payload.guarantor2?.liveImage
        )
      );

      // IMPORTANT:
      // api.js already contains /api.
      if (isEditMode) {
        await api.put(
          `/customers/${id}`,
          payload
        );
      } else {
        await api.post(
          '/customers',
          payload
        );
      }

      navigate('/customers');
    } catch (error) {
      console.error(
        'SAVE CUSTOMER ERROR:',
        error
      );

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
  // FINGERPRINT + PHOTO COMPONENT
  // =========================================================

  const FingerprintButton = ({
    personType,
    label,
    required = false,
  }) => {
    const status =
      fingerprintStatus[personType];

    const message =
      fingerprintMessage[personType];

    const isScanning =
      status === 'scanning';

    const isCaptured =
      status === 'captured';

    const isError =
      status === 'error';

    let fingerprintImage = '';
    let fingerprintCapturedAt = null;

    let liveImage = '';
    let liveImageCapturedAt = null;

    // CUSTOMER
    if (personType === 'customer') {
      fingerprintImage =
        formData.fingerprintImage || '';

      fingerprintCapturedAt =
        formData.fingerprintCapturedAt ||
        null;

      liveImage =
        formData.liveImage || '';

      liveImageCapturedAt =
        formData.liveImageCapturedAt ||
        null;
    }

    // GUARANTOR 1
    if (
      personType === 'guarantor1'
    ) {
      fingerprintImage =
        formData.guarantor1
          ?.fingerprintImage || '';

      fingerprintCapturedAt =
        formData.guarantor1
          ?.fingerprintCapturedAt ||
        null;

      liveImage =
        formData.guarantor1
          ?.liveImage || '';

      liveImageCapturedAt =
        formData.guarantor1
          ?.liveImageCapturedAt ||
        null;
    }

    // GUARANTOR 2
    if (
      personType === 'guarantor2'
    ) {
      fingerprintImage =
        formData.guarantor2
          ?.fingerprintImage || '';

      fingerprintCapturedAt =
        formData.guarantor2
          ?.fingerprintCapturedAt ||
        null;

      liveImage =
        formData.guarantor2
          ?.liveImage || '';

      liveImageCapturedAt =
        formData.guarantor2
          ?.liveImageCapturedAt ||
        null;
    }

    return (
      <div className="mt-4 border border-dashed border-gray-300 rounded-xl p-3 sm:p-4 bg-gray-50">

        {/* ===================================================
            FINGERPRINT HEADER
        =================================================== */}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

          <div className="flex items-center gap-3 min-w-0">

            <div
              className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center ${
                isCaptured
                  ? 'bg-green-100 text-green-600'
                  : isError
                  ? 'bg-red-100 text-red-600'
                  : 'bg-indigo-100 text-indigo-600'
              }`}
            >
              {isCaptured ? (
                <CheckCircle2 className="w-6 h-6" />
              ) : (
                <Fingerprint className="w-6 h-6" />
              )}
            </div>

            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-800">
                {label} Fingerprint

                {required && (
                  <span className="text-red-500 ml-1">
                    *
                  </span>
                )}
              </p>

              <p className="text-[11px] text-gray-500 break-words">
                {message ||
                  'DigitalPersona U.are.U 4500'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              captureFingerprint(
                personType
              )
            }
            disabled={
              isScanning ||
              !!activeFingerprint ||
              cameraOpen
            }
            className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm ${
              isCaptured
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isScanning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Scanning...</span>
              </>
            ) : isCaptured ? (
              <>
                <ScanLine className="w-4 h-4" />
                <span>Scan Again</span>
              </>
            ) : (
              <>
                <Fingerprint className="w-4 h-4" />
                <span>Scan Fingerprint</span>
              </>
            )}
          </button>
        </div>

        {/* ===================================================
            SCANNING
        =================================================== */}

        {isScanning && (
          <div className="mt-3 bg-indigo-50 border border-indigo-100 rounded-lg p-3 text-center">

            <Fingerprint className="w-8 h-8 text-indigo-600 mx-auto animate-pulse" />

            <p className="text-xs font-bold text-indigo-700 mt-1">
              Place finger on DigitalPersona scanner
            </p>

          </div>
        )}

        {/* ===================================================
            FINGERPRINT IMAGE
        =================================================== */}

        {isCaptured &&
          fingerprintImage && (
            <div className="mt-4 bg-white border border-green-200 rounded-xl p-3 sm:p-4">

              <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">

                <div className="w-28 h-36 sm:w-32 sm:h-40 shrink-0 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden">

                  <img
                    src={getImageSource(
                      fingerprintImage
                    )}
                    alt={`${label} fingerprint`}
                    className="w-full h-full object-contain"
                  />

                </div>

                <div className="flex-1 min-w-0 text-center sm:text-left">

                  <p className="text-sm font-bold text-green-700 flex items-center justify-center sm:justify-start gap-2">

                    <CheckCircle2 className="w-4 h-4 shrink-0" />

                    Fingerprint captured successfully

                  </p>

                  {fingerprintCapturedAt && (
                    <div className="mt-2">

                      <p className="text-[10px] uppercase font-bold text-gray-400">
                        Fingerprint Captured
                      </p>

                      <p className="text-xs sm:text-sm font-semibold text-gray-700 break-words">
                        {formatCaptureDateTime(
                          fingerprintCapturedAt
                        )}
                      </p>

                    </div>
                  )}

                  <p className="text-[11px] text-gray-400 mt-2">
                    Visual fingerprint image captured from DigitalPersona 4500.
                  </p>

                </div>

              </div>

            </div>
          )}

        {/* ===================================================
            PHOTO
        =================================================== */}

        <div className="mt-4 border-t border-gray-200 pt-4">

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

            <div className="flex items-center gap-3 min-w-0">

              <div
                className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center ${
                  liveImage
                    ? 'bg-green-100 text-green-600'
                    : 'bg-blue-100 text-blue-600'
                }`}
              >
                {liveImage ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : (
                  <Camera className="w-6 h-6" />
                )}
              </div>

              <div className="min-w-0">

                <p className="text-sm font-bold text-gray-800">

                  {label} Photo

                  {required && (
                    <span className="text-red-500 ml-1">
                      *
                    </span>
                  )}

                </p>

                <p className="text-[11px] text-gray-500">
                  Camera / Dashcam Photo
                </p>

              </div>

            </div>

            <button
              type="button"
              onClick={() =>
                openPhotoCamera(
                  personType
                )
              }
              disabled={
                !!activeFingerprint ||
                cameraLoading
              }
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cameraLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>
                    Opening Camera...
                  </span>
                </>
              ) : liveImage ? (
                <>
                  <Camera className="w-4 h-4" />
                  <span>
                    Retake Photo
                  </span>
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4" />
                  <span>
                    Record Photo
                  </span>
                </>
              )}
            </button>

          </div>

          {/* =================================================
              SAVED PHOTO
          ================================================= */}

          {liveImage && (
            <div className="mt-4 bg-white border border-blue-200 rounded-xl p-3 sm:p-4">

              <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">

                <div className="w-40 h-32 shrink-0 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden">

                  <img
                    src={getImageSource(
                      liveImage
                    )}
                    alt={`${label} captured`}
                    className="w-full h-full object-cover"
                  />

                </div>

                <div className="flex-1 min-w-0 text-center sm:text-left">

                  <p className="text-sm font-bold text-green-700 flex items-center justify-center sm:justify-start gap-2">

                    <CheckCircle2 className="w-4 h-4" />

                    Photo captured successfully

                  </p>

                  {liveImageCapturedAt && (
                    <div className="mt-2">

                      <p className="text-[10px] uppercase font-bold text-gray-400">
                        Photo Captured
                      </p>

                      <p className="text-xs sm:text-sm font-semibold text-gray-700 break-words">
                        {formatCaptureDateTime(
                          liveImageCapturedAt
                        )}
                      </p>

                    </div>
                  )}

                  <p className="text-[11px] text-gray-400 mt-2">
                    Photo captured from the selected camera/dashcam.
                  </p>

                </div>

              </div>

            </div>
          )}

        </div>

        {/* ===================================================
            ERROR
        =================================================== */}

        {isError && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-2.5">

            <p className="text-xs font-bold text-red-700">
              {message}
            </p>

          </div>
        )}

      </div>
    );
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (fetching) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-3">

        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>

        <span className="text-gray-500 text-sm font-bold">
          Querying profiles database...
        </span>

      </div>
    );
  }

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="flex items-start space-x-3">

        <Link
          to="/customers"
          className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-600 shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>

        <div className="min-w-0">

          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
            {isEditMode
              ? 'Modify Customer Profile'
              : 'Register New Buyer & Guarantors'}
          </h2>

          <p className="text-sm text-gray-600 mt-1">
            Enter customer identity and up to 2
            Zamanatdaar details.
          </p>

        </div>

      </div>

      {/* =====================================================
          ERROR
      ===================================================== */}

      {errorMsg && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg flex items-start space-x-3 text-red-800">

          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />

          <span className="text-sm font-semibold">
            {errorMsg}
          </span>

        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-6"
      >

        {/* ===================================================
            MAIN CUSTOMER
        =================================================== */}

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 sm:p-6 space-y-6">

          <h3 className="font-bold text-gray-800 border-b pb-2 text-base">
            Asal Customer ki Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <div className="space-y-4">

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500">
                  Full Name
                </label>

                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="e.g. Muhammad Rizwan"
                  className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500">
                  Father's Name
                </label>

                <input
                  type="text"
                  name="fatherName"
                  value={formData.fatherName}
                  onChange={handleChange}
                  placeholder="e.g. Abdul Ghafoor"
                  className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500">
                  CNIC
                </label>

                <input
                  type="text"
                  name="cnic"
                  value={formData.cnic}
                  onChange={handleChange}
                  placeholder="35401-1234567-1"
                  maxLength={15}
                  className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 tracking-wide"
                  required
                />
              </div>

            </div>

            <div className="space-y-4">

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500">
                    Mobile Number
                  </label>

                  <input
                    type="text"
                    name="mobileNumber"
                    value={
                      formData.mobileNumber
                    }
                    onChange={handleChange}
                    placeholder="03001234567"
                    className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500">
                    Alt Phone
                  </label>

                  <input
                    type="text"
                    name="alternateMobileNumber"
                    value={
                      formData.alternateMobileNumber
                    }
                    onChange={handleChange}
                    placeholder="03007654321"
                    className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500">
                  Home Address
                </label>

                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Street / Mohalla details"
                  className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500">
                  City
                </label>

                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

            </div>

          </div>

          <FingerprintButton
            personType="customer"
            label="Customer"
          />

        </div>

        {/* ===================================================
            GUARANTOR 1
        =================================================== */}

        <div className="bg-white border border-purple-200 rounded-2xl shadow-sm p-4 sm:p-6 space-y-4">

          <div className="border-b border-purple-100 pb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">

            <h3 className="font-extrabold text-purple-900 text-sm uppercase tracking-wider flex items-center space-x-2">

              <ShieldCheck className="w-5 h-5 text-purple-600" />

              <span>
                Zamanatdar 1 (Optional)
              </span>

            </h3>

            <span className="w-fit text-[10px] font-bold text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded-full">
              Primary Guarantor
            </span>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-bold text-gray-600">

            <div>
              <label className="block text-gray-400 uppercase">
                Zamanti 1 Name
              </label>

              <input
                type="text"
                value={
                  formData.guarantor1?.name ||
                  ''
                }
                onChange={(e) =>
                  handleGuarantorChange(
                    'guarantor1',
                    'name',
                    e.target.value
                  )
                }
                placeholder="Name"
                className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-gray-400 uppercase">
                Father Name
              </label>

              <input
                type="text"
                value={
                  formData.guarantor1
                    ?.fatherName || ''
                }
                onChange={(e) =>
                  handleGuarantorChange(
                    'guarantor1',
                    'fatherName',
                    e.target.value
                  )
                }
                placeholder="Father Name"
                className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-gray-400 uppercase">
                Mobile Number
              </label>

              <input
                type="text"
                value={
                  formData.guarantor1
                    ?.mobileNumber || ''
                }
                onChange={(e) =>
                  handleGuarantorChange(
                    'guarantor1',
                    'mobileNumber',
                    e.target.value
                  )
                }
                placeholder="0300..."
                className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-gray-400 uppercase">
                CNIC Number
              </label>

              <input
                type="text"
                value={
                  formData.guarantor1?.cnic ||
                  ''
                }
                onChange={(e) =>
                  handleGuarantorChange(
                    'guarantor1',
                    'cnic',
                    e.target.value
                  )
                }
                placeholder="35401-..."
                maxLength={15}
                className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 tracking-wide"
              />
            </div>

            <div>
              <label className="block text-gray-400 uppercase">
                Customer Se Rishta
              </label>

              <input
                type="text"
                value={
                  formData.guarantor1
                    ?.relation || ''
                }
                onChange={(e) =>
                  handleGuarantorChange(
                    'guarantor1',
                    'relation',
                    e.target.value
                  )
                }
                placeholder="e.g. Bhai, Dost, Chacha"
                className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-gray-400 uppercase">
                Zamanti 1 Pata
              </label>

              <input
                type="text"
                value={
                  formData.guarantor1
                    ?.address || ''
                }
                onChange={(e) =>
                  handleGuarantorChange(
                    'guarantor1',
                    'address',
                    e.target.value
                  )
                }
                placeholder="Area / Village"
                className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

          </div>

          <FingerprintButton
            personType="guarantor1"
            label="Zamanti 1"
          />

        </div>

        {/* ===================================================
            GUARANTOR 2
        =================================================== */}

        <div className="bg-white border border-indigo-200 rounded-2xl shadow-sm p-4 sm:p-6 space-y-4">

          <div className="border-b border-indigo-100 pb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">

            <h3 className="font-extrabold text-indigo-900 text-sm uppercase tracking-wider flex items-center space-x-2">

              <ShieldCheck className="w-5 h-5 text-indigo-600" />

              <span>
                Zamanatdar 2 (Optional)
              </span>

            </h3>

            <span className="w-fit text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
              Secondary Guarantor
            </span>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-bold text-gray-600">

            <div>
              <label className="block text-gray-400 uppercase">
                Zamanti 2 Name
              </label>

              <input
                type="text"
                value={
                  formData.guarantor2?.name ||
                  ''
                }
                onChange={(e) =>
                  handleGuarantorChange(
                    'guarantor2',
                    'name',
                    e.target.value
                  )
                }
                placeholder="Name"
                className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-gray-400 uppercase">
                Father Name
              </label>

              <input
                type="text"
                value={
                  formData.guarantor2
                    ?.fatherName || ''
                }
                onChange={(e) =>
                  handleGuarantorChange(
                    'guarantor2',
                    'fatherName',
                    e.target.value
                  )
                }
                placeholder="Father Name"
                className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-gray-400 uppercase">
                Mobile Number
              </label>

              <input
                type="text"
                value={
                  formData.guarantor2
                    ?.mobileNumber || ''
                }
                onChange={(e) =>
                  handleGuarantorChange(
                    'guarantor2',
                    'mobileNumber',
                    e.target.value
                  )
                }
                placeholder="0300..."
                className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-gray-400 uppercase">
                CNIC Number
              </label>

              <input
                type="text"
                value={
                  formData.guarantor2?.cnic ||
                  ''
                }
                onChange={(e) =>
                  handleGuarantorChange(
                    'guarantor2',
                    'cnic',
                    e.target.value
                  )
                }
                placeholder="35401-..."
                maxLength={15}
                className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 tracking-wide"
              />
            </div>

            <div>
              <label className="block text-gray-400 uppercase">
                Customer Se Rishta
              </label>

              <input
                type="text"
                value={
                  formData.guarantor2
                    ?.relation || ''
                }
                onChange={(e) =>
                  handleGuarantorChange(
                    'guarantor2',
                    'relation',
                    e.target.value
                  )
                }
                placeholder="e.g. Mamoo, Parosi, Dost"
                className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-gray-400 uppercase">
                Zamanti 2 Pata
              </label>

              <input
                type="text"
                value={
                  formData.guarantor2
                    ?.address || ''
                }
                onChange={(e) =>
                  handleGuarantorChange(
                    'guarantor2',
                    'address',
                    e.target.value
                  )
                }
                placeholder="Area / Village"
                className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

          </div>

          <FingerprintButton
            personType="guarantor2"
            label="Zamanti 2"
          />

        </div>

        {/* ===================================================
            SUBMIT
        =================================================== */}

        <div className="flex justify-end p-4 bg-white border border-gray-200 rounded-2xl shadow-sm">

          <button
            type="submit"
            disabled={
              loading ||
              !!activeFingerprint ||
              cameraOpen
            }
            className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl transition-colors disabled:bg-indigo-400 shadow-sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />

                <span>
                  Saving Details...
                </span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />

                <span>
                  {isEditMode
                    ? 'Update Profile & Guarantors'
                    : 'Save Customer & 2 Zamanti'}
                </span>
              </>
            )}
          </button>

        </div>

      </form>

      {/* =====================================================
          CAMERA MODAL
      ===================================================== */}

      {cameraOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm p-2 sm:p-4 flex items-center justify-center">

          <div className="w-full max-w-xl max-h-[96vh] sm:max-h-[94vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">

            {/* HEADER */}

            <div className="sticky top-0 z-20 bg-white border-b border-gray-200 px-3 sm:px-5 py-3 sm:py-4 flex items-center justify-between gap-3">

              <div className="min-w-0">

                <h3 className="text-base sm:text-lg font-bold text-gray-900 truncate">

                  Record{' '}

                  {activeCameraPerson ===
                  'customer'
                    ? 'Customer'
                    : activeCameraPerson ===
                      'guarantor1'
                    ? 'Zamanti 1'
                    : 'Zamanti 2'}{' '}

                  Photo

                </h3>

                <p className="text-[11px] sm:text-xs text-gray-500 mt-1">
                  Position the person clearly in front of the camera.
                </p>

              </div>

              <button
                type="button"
                onClick={closeCamera}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 shrink-0"
                aria-label="Close camera"
              >
                <X className="w-5 h-5" />
              </button>

            </div>

            {/* CAMERA SELECTOR */}

            <div className="px-3 sm:px-5 pt-3 sm:pt-4">

              <label className="block text-[10px] sm:text-xs font-bold uppercase text-gray-500 mb-1">
                Select Camera
              </label>

              <select
                value={selectedCamera}
                onChange={
                  handleCameraChange
                }
                disabled={cameraLoading}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              >

                {cameraDevices.length ===
                0 ? (
                  <option value="">
                    No camera detected
                  </option>
                ) : (
                  cameraDevices.map(
                    (device, index) => (
                      <option
                        key={
                          device.deviceId ||
                          index
                        }
                        value={
                          device.deviceId
                        }
                      >
                        {device.label ||
                          `Camera ${
                            index + 1
                          }`}
                      </option>
                    )
                  )
                )}

              </select>

            </div>

            {/* ERROR */}

            {cameraError && (
              <div className="mx-3 sm:mx-5 mt-3 sm:mt-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">

                <CameraOff className="w-5 h-5 text-red-600 shrink-0" />

                <p className="text-xs sm:text-sm font-semibold text-red-700 break-words">
                  {cameraError}
                </p>

              </div>
            )}

            {/* CAMERA */}

            <div className="p-3 sm:p-5">

              <div className="relative w-full bg-black rounded-xl overflow-hidden aspect-video max-h-[55vh] sm:max-h-[60vh] flex items-center justify-center">

                {/* IMPORTANT:
                    Video stays mounted even when preview
                    exists. This fixes Retake Photo. */}

                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className={`w-full h-full object-contain ${
                    photoPreview
                      ? 'invisible'
                      : 'visible'
                  }`}
                  style={{
                    transform:
                      'scaleX(-1)',
                  }}
                />

                {photoPreview && (
                  <img
                    src={photoPreview}
                    alt="Captured preview"
                    className="absolute inset-0 w-full h-full object-contain"
                  />
                )}

                {cameraLoading &&
                  !photoPreview && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white">

                      <Loader2 className="w-9 h-9 sm:w-10 sm:h-10 animate-spin" />

                      <p className="text-xs sm:text-sm font-bold mt-2">
                        Opening camera...
                      </p>

                    </div>
                  )}

              </div>

              <canvas
                ref={canvasRef}
                className="hidden"
              />

            </div>

            {/* BUTTONS */}

            <div className="px-3 sm:px-5 pb-3 sm:pb-5 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">

              {!photoPreview ? (
                <button
                  type="button"
                  onClick={capturePhoto}
                  disabled={cameraLoading}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >

                  <Camera className="w-5 h-5" />

                  Capture Photo

                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={retakePhoto}
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-bold"
                  >

                    <RotateCcw className="w-5 h-5" />

                    Retake Photo

                  </button>

                  <button
                    type="button"
                    onClick={
                      saveCapturedPhoto
                    }
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold shadow-sm"
                  >

                    <CheckCircle2 className="w-5 h-5" />

                    Use This Photo

                  </button>
                </>
              )}

              <button
                type="button"
                onClick={closeCamera}
                className={`w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm font-bold ${
                  photoPreview
                    ? 'sm:col-span-2'
                    : ''
                }`}
              >

                <X className="w-5 h-5" />

                Cancel

              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
};

export default AddEditCustomer;
