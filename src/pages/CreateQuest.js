import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import './CreateQuest.css';
import '../styles/quest-buttons.css';
import { FaPlus, FaTrash, FaExclamationCircle } from 'react-icons/fa';
import { saveQuestDetails, loadQuestDataForEdit } from '../utils/sessionManager';

const CreateQuest = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isEditMode = location.state?.editMode || false;
  const editQuestId = location.state?.questId || null;
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    domain: '',
    difficulty: '',
    theme: '',
    toolsRequired: '',
    resources: '',
    media: []
  });
  const [errorToast, setErrorToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [mediaType, setMediaType] = useState('');
  const [mediaDescription, setMediaDescription] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [mediaDropdownOpen, setMediaDropdownOpen] = useState(false);

  // Load data from sessionStorage if in edit mode
  useEffect(() => {
    const loadEditData = async () => {
      if (isEditMode && !initialDataLoaded) {
        try {
          console.log('Loading quest data for editing, questId:', editQuestId);
          
          // Check if we have quest data in session storage first
          const storedQuestDetails = sessionStorage.getItem('questDetails');
          
          // If we don't have quest data in session storage and we have a valid questId,
          // load the data from API using our utility function
          if (!storedQuestDetails && editQuestId && !editQuestId.startsWith('temp-')) {
            await loadQuestDataForEdit(editQuestId, navigate, toast);
          }
          
          // Now check again for quest data in session storage
          const refreshedQuestDetails = sessionStorage.getItem('questDetails');
          
          if (refreshedQuestDetails) {
            const questData = JSON.parse(refreshedQuestDetails);
            console.log('Loaded quest data for editing:', questData);
            
            // Format data to match form structure
            const formattedData = {
              title: questData.title || '',
              description: Array.isArray(questData.description) 
                ? questData.description.join('\n') 
                : (questData.description || ''),
              domain: Array.isArray(questData.tags) 
                ? questData.tags.join(', ')
                : (typeof questData.tags === 'string' ? questData.tags : ''),
              difficulty: questData.level || questData.difficulty || 'Beginner',
              theme: questData.theme || '',
              toolsRequired: Array.isArray(questData.toolsRequired) 
                ? questData.toolsRequired.join(', ')
                : (typeof questData.toolsRequired === 'string' ? questData.toolsRequired : ''),
              resources: Array.isArray(questData.resources) 
                ? questData.resources.join(', ')
                : (typeof questData.resources === 'string' ? questData.resources : ''),
              media: questData.media || []
            };
            
            // If we have a thumbnailUrl but no media, create a media item for it
            if (questData.thumbnailUrl && (!formattedData.media || formattedData.media.length === 0)) {
              formattedData.media = [{
                id: Date.now().toString(),
                type: 'image',
                description: 'Quest thumbnail',
                url: questData.thumbnailUrl
              }];
            }
            
            setFormData(formattedData);
            setInitialDataLoaded(true);
            toast.info('Quest data loaded for editing');
          } else {
            console.warn('No quest data found in session storage for editing');
            toast.warning('No quest data found for editing');
            
            // If we can't load data and we're in edit mode, go back to quests page
            if (isEditMode && editQuestId) {
              toast.error('Failed to load quest data. Returning to quests page.');
              navigate('/admin/quests');
            }
          }
        } catch (err) {
          console.error('Error loading quest data for editing:', err);
          toast.error('Failed to load quest data for editing');
          navigate('/admin/quests');
        }
      }
    };
    
    loadEditData();
  }, [isEditMode, editQuestId, initialDataLoaded, navigate]);

  // Clear error toast after 3 seconds
  useEffect(() => {
    if (errorToast) {
      const timer = setTimeout(() => {
        setErrorToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [errorToast]);

  // Calculate progress based on filled fields
  const calculateProgress = () => {
    const { title, description, domain, difficulty, theme } = formData;
    const requiredFields = [title, description, domain, difficulty, theme];
    const filledFields = requiredFields.filter(field => field.trim() !== '').length;
    return (filledFields / requiredFields.length) * 100;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = (e) => {
    setUploadedFile(e.target.files[0]);
  };

  const handleAddMedia = () => {
    if (!mediaType) {
      setErrorToast('Please select a media type');
      return;
    }

    if (!mediaDescription.trim()) {
      setErrorToast('Please provide a media description');
      return;
    }

    // If it's a file type media, ensure a file is uploaded
    if (mediaType === 'file' && !uploadedFile) {
      setErrorToast('Please upload a file');
      return;
    }

    // Simulating file upload (in a real app, you'd upload to server/cloud)
    let fileUrl = '';
    if (uploadedFile) {
      // In a real app, this would be the URL from your server/cloud storage
      fileUrl = URL.createObjectURL(uploadedFile);
    }

    const newMedia = {
      id: Date.now().toString(),
      type: mediaType,
      description: mediaDescription,
      url: mediaType === 'file' ? fileUrl : mediaDescription // For non-file media, use description as URL
    };

    setFormData(prev => ({
      ...prev,
      media: [...prev.media, newMedia]
    }));

    // Reset media form
    setMediaType('');
    setMediaDescription('');
    setUploadedFile(null);
    setMediaDropdownOpen(false);
  };

  const handleRemoveMedia = (id) => {
    setFormData(prev => ({
      ...prev,
      media: prev.media.filter(item => item.id !== id)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Validate required fields
    if (!formData.title.trim()) {
      setErrorToast('Quest title is required');
      setLoading(false);
      return;
    }

    try {
      // Format data for storage in sessionStorage
      const formattedData = {
        ...formData,
        description: formData.description.trim().split('\n').filter(line => line.trim() !== ''), // API expects an array
        level: formData.difficulty.trim() || 'Beginner',
        thumbnailUrl: formData.media.length > 0 ? formData.media[0].url : '',
        tags: formData.domain.split(',').map(tag => tag.trim()).filter(tag => tag !== ''),
        toolsRequired: formData.toolsRequired.split(',').map(tool => tool.trim()).filter(tool => tool !== ''),
        resources: formData.resources.split(',').map(resource => resource.trim()).filter(resource => resource !== ''),
        // These fields will be added in stage 2 (questions/tasks)
        enrolledCount: 0,
        duration: 0,
        // Preserve ID if in edit mode
        id: isEditMode && editQuestId ? editQuestId : `temp-${Date.now()}`,
        quizId: isEditMode && editQuestId ? editQuestId : `temp-${Date.now()}`,
        // Track if this is a new or edit mode quest
        isEditMode: isEditMode,
        // Mark that this has not been synced to the backend yet
        backendSynced: false,
        createdAt: new Date().toISOString()
      };
      
      // Use the utility function to save quest details
      saveQuestDetails(formattedData);
      
      toast.info('Quest details saved temporarily. Changes will be uploaded in the final step.');
      
      // Navigate to next page
      navigate('/admin/create-quest/tasks');
    } catch (err) {
      console.error('Error processing quest details:', err);
      setErrorToast('Error saving quest details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (isEditMode) {
      // If in edit mode, go back to quests page
      navigate('/admin/quests');
    } else {
      // Otherwise, go back to previous page
      navigate(-1);
    }
  };

  const progress = calculateProgress();

  return (
    <div className="create-quest-container">
      <h1 className="create-quest-title">Create Your Quest</h1>
      
      {/* Progress bar */}
      <div className="progress-container">
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>
      
      {/* Error toast */}
      {errorToast && (
        <div className="error-toast">
          <span className="error-toast-icon"><FaExclamationCircle /></span>
          <span className="error-toast-message">{errorToast}</span>
        </div>
      )}
      
      <form className="create-quest-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Quest Title</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className="form-input"
            placeholder="Enter quest title"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="form-textarea"
            placeholder="Enter quest description"
            rows="6"
          ></textarea>
        </div>
        
        <div className="form-group">
          <label htmlFor="domain">Domain/Subject</label>
          <input
            type="text"
            id="domain"
            name="domain"
            value={formData.domain}
            onChange={handleChange}
            className="form-input"
            placeholder="Enter domain or subject (comma separated for tags)"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="difficulty">Difficulty</label>
          <input
            type="text"
            id="difficulty"
            name="difficulty"
            value={formData.difficulty}
            onChange={handleChange}
            className="form-input"
            placeholder="Enter difficulty level (Beginner, Intermediate, Advanced)"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="theme">Theme</label>
          <input
            type="text"
            id="theme"
            name="theme"
            value={formData.theme}
            onChange={handleChange}
            className="form-input"
            placeholder="Enter theme"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="toolsRequired">Tools Required</label>
          <input
            type="text"
            id="toolsRequired"
            name="toolsRequired"
            value={formData.toolsRequired}
            onChange={handleChange}
            className="form-input"
            placeholder="Enter tools required (comma separated)"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="resources">Resources</label>
          <input
            type="text"
            id="resources"
            name="resources"
            value={formData.resources}
            onChange={handleChange}
            className="form-input"
            placeholder="Enter resource URLs (comma separated)"
          />
        </div>
        
        <div className="form-group">
          <label>Add Media</label>
          
          <div className="media-selector">
            <div 
              className="media-type-selector" 
              onClick={() => setMediaDropdownOpen(!mediaDropdownOpen)}
            >
              <span>{mediaType ? mediaType : 'Select Media Type'}</span>
              <span className="dropdown-arrow">▼</span>
            </div>
            
            {mediaDropdownOpen && (
              <div className="media-type-dropdown">
                <div onClick={() => { setMediaType('file'); setMediaDropdownOpen(false); }}>
                  File Upload
                </div>
                <div onClick={() => { setMediaType('link'); setMediaDropdownOpen(false); }}>
                  External Link
                </div>
                <div onClick={() => { setMediaType('embed'); setMediaDropdownOpen(false); }}>
                  Embed Code
                </div>
              </div>
            )}
          </div>
          
          <div className="media-description-input">
            <input
              type="text"
              placeholder="Media Description"
              value={mediaDescription}
              onChange={(e) => setMediaDescription(e.target.value)}
              className="form-input"
            />
          </div>
          
          {mediaType === 'file' && (
            <div className="file-upload">
              <input
                type="file"
                onChange={handleFileUpload}
                className="file-input"
                id="fileUpload"
              />
              <label htmlFor="fileUpload" className="file-label">
                <span>Attach File</span>
              </label>
              {uploadedFile && <span className="file-name">{uploadedFile.name}</span>}
            </div>
          )}
          
          <button 
            type="button" 
            className="add-media-btn" 
            onClick={handleAddMedia}
          >
            <FaPlus /> Add
          </button>
        </div>
        
        {/* Display Added Media */}
        {formData.media.length > 0 && (
          <div className="added-media-section">
            <h3>Attached Media</h3>
            <div className="media-list">
              {formData.media.map(item => (
                <div key={item.id} className="media-item">
                  <div className="media-item-content">
                    <div className="media-item-icon">
                      {item.type === 'file' ? '📄' : item.type === 'link' ? '🔗' : '📌'}
                    </div>
                    <div className="media-item-details">
                      <div className="media-item-description">{item.description}</div>
                      <div className="media-item-type">{item.type}</div>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    className="media-delete-btn" 
                    onClick={() => handleRemoveMedia(item.id)}
                  >
                    <FaTrash />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="form-actions">
          <button 
            type="button" 
            className="back-button" 
            onClick={handleBack}
          >
            Back
          </button>
          <button 
            type="submit" 
            className="next-button" 
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Next'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateQuest; 