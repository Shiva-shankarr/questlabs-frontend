import React from 'react';
import { useNavigate } from 'react-router-dom';

const SearchSuggestions = ({ suggestions = [], selectedIndex = -1, onSelect, onClose }) => {
  const navigate = useNavigate();

  const handleSuggestionClick = (suggestion) => {
    navigate(`/course/${suggestion.id}`);
    onSelect();
  };

  return (
    <div className="search-suggestions">
      {suggestions.length > 0 ? (
        suggestions.map((suggestion, index) => (
          <div
            key={suggestion.id}
            className={`suggestion-item ${index === selectedIndex ? 'selected' : ''}`}
            onClick={() => handleSuggestionClick(suggestion)}
          >
            <div className="suggestion-content">
              <h5>{suggestion.title}</h5>
              <p>{suggestion.description}</p>
            </div>
            <div className="suggestion-meta">
              <span className="difficulty">{suggestion.difficulty}</span>
              <span className="duration">{suggestion.duration} min</span>
            </div>
          </div>
        ))
      ) : (
        <div className="no-suggestions">
          <p>No results found</p>
        </div>
      )}
    </div>
  );
};

export default SearchSuggestions; 