import React, { useState } from 'react';
import { Container, Row, Col, Form, Button, Card, Alert, Spinner } from 'react-bootstrap';
import { evaluateAnswer } from '../utils/answerEvaluator';

/**
 * Test page for the answer evaluator to verify its functionality
 */
const TestEvaluator = () => {
  const [question, setQuestion] = useState({
    questionText: 'Explain the concept of React hooks and give two examples.',
    objective: [
      'Define what React hooks are and their purpose',
      'Explain how hooks help with "state management"',
      'Give at least two examples of common hooks, like "useState" and "useEffect"',
      'Briefly explain when you would use each hook example'
    ],
    type: 'TEXT'
  });
  
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  
  const handleTextareaChange = (field, value) => {
    if (field === 'objective') {
      setQuestion({
        ...question,
        objective: value.split('\n').filter(line => line.trim())
      });
    } else if (field === 'answer') {
      setAnswer(value);
    } else {
      setQuestion({
        ...question,
        [field]: value
      });
    }
  };
  
  const handleTypeChange = (e) => {
    setQuestion({
      ...question,
      type: e.target.value
    });
  };
  
  const handleEvaluate = () => {
    setIsEvaluating(true);
    
    // Use a slight delay to allow UI to update
    setTimeout(() => {
      const evaluation = evaluateAnswer(answer, question);
      setResult(evaluation);
      setIsEvaluating(false);
    }, 500);
  };
  
  return (
    <Container fluid className="py-4 bg-dark text-light">
      <h1 className="mb-4 text-center">Answer Evaluator Test</h1>
      
      <Row>
        <Col md={6} className="mb-4">
          <Card bg="dark" text="light" className="h-100">
            <Card.Header>
              <h4>Question Configuration</h4>
            </Card.Header>
            <Card.Body>
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Question Type</Form.Label>
                  <Form.Select 
                    value={question.type}
                    onChange={handleTypeChange}
                  >
                    <option value="TEXT">Text Answer</option>
                    <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                    <option value="CODE">Code</option>
                  </Form.Select>
                </Form.Group>
                
                <Form.Group className="mb-3">
                  <Form.Label>Question Text</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={question.questionText}
                    onChange={(e) => handleTextareaChange('questionText', e.target.value)}
                    placeholder="Enter the question text"
                  />
                </Form.Group>
                
                <Form.Group className="mb-3">
                  <Form.Label>Objectives (one per line)</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={5}
                    value={question.objective.join('\n')}
                    onChange={(e) => handleTextareaChange('objective', e.target.value)}
                    placeholder="Enter objectives, one per line"
                  />
                  <Form.Text className="text-muted">
                    Hint: Put key terms in "quotes" to highlight them as keywords
                  </Form.Text>
                </Form.Group>
              </Form>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={6} className="mb-4">
          <Card bg="dark" text="light" className="h-100">
            <Card.Header>
              <h4>Answer Input</h4>
            </Card.Header>
            <Card.Body>
              <Form.Group className="mb-3">
                <Form.Label>Your Answer</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={10}
                  value={answer}
                  onChange={(e) => handleTextareaChange('answer', e.target.value)}
                  placeholder="Type your answer here"
                />
              </Form.Group>
              
              <Button 
                variant="primary" 
                onClick={handleEvaluate}
                disabled={isEvaluating || !answer.trim()}
                className="d-block w-100"
              >
                {isEvaluating ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Evaluating...
                  </>
                ) : 'Evaluate Answer'}
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {result && (
        <Row>
          <Col md={12}>
            <Card bg={result.isCorrect ? 'success' : 'danger'} text="white" className="mb-4">
              <Card.Header>
                <h4>Evaluation Result</h4>
              </Card.Header>
              <Card.Body>
                <Alert variant={result.isCorrect ? 'success' : 'danger'}>
                  <strong>
                    {result.isCorrect ? 'Correct! ' : 'Needs improvement. '}
                  </strong>
                  {result.feedback}
                </Alert>
                
                <div className="mb-3">
                  <strong>Score:</strong> {(result.score * 100).toFixed(0)}%
                </div>
                
                <div className="mb-3">
                  <strong>Confidence:</strong> {(result.confidence * 100).toFixed(0)}%
                </div>
                
                {result.matchedKeywords && result.matchedKeywords.length > 0 && (
                  <div className="mb-3">
                    <strong>Matched Keywords:</strong>
                    <ul>
                      {result.matchedKeywords.map((keyword, idx) => (
                        <li key={idx}>{keyword}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {result.missingKeywords && result.missingKeywords.length > 0 && (
                  <div className="mb-3">
                    <strong>Missing Keywords:</strong>
                    <ul>
                      {result.missingKeywords.map((keyword, idx) => (
                        <li key={idx}>{keyword}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {result.missingFunctions && result.missingFunctions.length > 0 && (
                  <div className="mb-3">
                    <strong>Missing Functions:</strong>
                    <ul>
                      {result.missingFunctions.map((func, idx) => (
                        <li key={idx}>{func}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </Container>
  );
};

export default TestEvaluator;