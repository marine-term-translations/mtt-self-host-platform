import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { backendApi } from '../services/api';
import {
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  AlertCircle,
  Save,
  RefreshCw,
  Filter,
  X
} from 'lucide-react';

const API_URL = backendApi.baseUrl;

// Utility: Extract label from URI - handles both '/' and '#' separators
function getUriLabel(uri: string): string {
  const parts = uri.split(/[/#]/);
  return parts.filter(p => p).pop() || uri;
}

interface RDFType {
  type: string;
  count: number;
}

interface Predicate {
  predicate: string;
  count: number;
  sampleValue: string;
  sampleType: string;
  languages?: string[];
}

interface FilterValue {
  value: string;
  count: number;
}

interface FilterRule {
  predicate: string;
  type: 'class' | 'regex';
  values?: string[]; // For class filters
  pattern?: string; // For regex filters
}

interface PredicatePath {
  path: string;
  label: string;
  isTranslatable: boolean;
  role?: 'label' | 'reference' | 'translatable';
  languageTag?: string;
  availableLanguages?: string[];
}

interface TypeConfig {
  type: string;
  paths: PredicatePath[];
  filters?: FilterRule[];
}

interface TranslationConfig {
  types: TypeConfig[];
  labelField?: string;
  referenceFields?: string[];
  translatableFields?: string[];
}

interface SourceConfigWizardProps {
  sourceId: number;
  graphName: string;
  existingConfig?: TranslationConfig;
  onConfigSaved: () => void;
}

export default function SourceConfigWizard({
  sourceId,
  graphName,
  existingConfig,
  onConfigSaved
}: SourceConfigWizardProps) {
  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4; // Reduced from 5 after merging steps 2 and 3

  // Step 1: RDF Type Selection
  const [types, setTypes] = useState<RDFType[]>([]);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [loadingTypes, setLoadingTypes] = useState(false);

  // Step 2: Preview Predicates (before filters)
  const [initialPredicates, setInitialPredicates] = useState<Predicate[]>([]);
  const [loadingInitialPredicates, setLoadingInitialPredicates] = useState(false);

  // Step 3: Configure Filters
  const [filterRules, setFilterRules] = useState<FilterRule[]>([]);
  const [filterablePredicates, setFilterablePredicates] = useState<Predicate[]>([]);
  const [selectedFilterPredicate, setSelectedFilterPredicate] = useState<string | null>(null);
  const [filterValues, setFilterValues] = useState<FilterValue[]>([]);
  const [filterValuesTotal, setFilterValuesTotal] = useState(0);
  const [loadingFilterValues, setLoadingFilterValues] = useState(false);
  const [regexPattern, setRegexPattern] = useState('');
  const [selectedFilterValues, setSelectedFilterValues] = useState<string[]>([]); // NEW: Track selected values
  
  // SPARQL test query state
  const [showSparqlQuery, setShowSparqlQuery] = useState(false);
  const [testingQuery, setTestingQuery] = useState(false);
  const [testQueryResults, setTestQueryResults] = useState<{ subjectCount: number; predicates: Predicate[] } | null>(null);

  // Step 4: Select Translatable Predicates
  const [filteredPredicates, setFilteredPredicates] = useState<Predicate[]>([]);
  const [selectedPaths, setSelectedPaths] = useState<PredicatePath[]>([]);
  const [loadingFilteredPredicates, setLoadingFilteredPredicates] = useState(false);

  // Step 5: Assign Roles
  const [labelField, setLabelField] = useState<string | null>(null);
  const [referenceFields, setReferenceFields] = useState<string[]>([]);

  // General state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load existing configuration if present
  useEffect(() => {
    if (existingConfig && existingConfig.types && existingConfig.types.length > 0) {
      const typeConfig = existingConfig.types[0];
      setSelectedType(typeConfig.type);
      setSelectedPaths(typeConfig.paths || []);
      setFilterRules(typeConfig.filters || []);
      setLabelField(existingConfig.labelField || null);
      setReferenceFields(existingConfig.referenceFields || []);
      
      // Start from step 4 if config exists
      setCurrentStep(4);
    }
  }, [existingConfig]);

  // Load RDF types
  const loadRDFTypes = useCallback(async () => {
    setLoadingTypes(true);
    setError('');
    try {
      const response = await axios.get(`${API_URL}/sources/${sourceId}/types`);
      setTypes(response.data.types);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load RDF types');
    } finally {
      setLoadingTypes(false);
    }
  }, [sourceId]);

  useEffect(() => {
    loadRDFTypes();
  }, [loadRDFTypes]);

  // Load initial predicates for step 2
  const loadInitialPredicates = async (rdfType: string) => {
    setLoadingInitialPredicates(true);
    setError('');
    try {
      const response = await axios.get(`${API_URL}/sources/${sourceId}/predicates`, {
        params: { type: rdfType }
      });
      setInitialPredicates(response.data.predicates);
      // Filter to only show literal predicates for filtering
      const literalPredicates = response.data.predicates.filter(
        (p: Predicate) => p.sampleType === 'literal' || p.sampleType === 'typed-literal'
      );
      setFilterablePredicates(literalPredicates);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load predicates');
    } finally {
      setLoadingInitialPredicates(false);
    }
  };

  // Load filter values for a predicate
  const loadFilterValues = async (predicate: string) => {
    if (!selectedType) return;
    
    setLoadingFilterValues(true);
    setError('');
    setSelectedFilterValues([]); // Reset selections when loading new values
    try {
      const response = await axios.get(`${API_URL}/sources/${sourceId}/filter-values`, {
        params: { type: selectedType, predicate, limit: 100 }
      });
      setFilterValues(response.data.values);
      setFilterValuesTotal(response.data.totalCount);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load filter values');
    } finally {
      setLoadingFilterValues(false);
    }
  };

  // Load filtered predicates for step 4
  const loadFilteredPredicates = async () => {
    if (!selectedType) return;
    
    setLoadingFilteredPredicates(true);
    setError('');
    try {
      const response = await axios.get(`${API_URL}/sources/${sourceId}/predicates-filtered`, {
        params: { 
          type: selectedType,
          filters: JSON.stringify(filterRules)
        }
      });
      setFilteredPredicates(response.data.predicates);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load filtered predicates');
    } finally {
      setLoadingFilteredPredicates(false);
    }
  };

  // Build SPARQL query string for display
  const buildSparqlQuery = (): string => {
    if (!selectedType || !graphName) return '';
    
    let filterConditions = '';
    if (filterRules && filterRules.length > 0) {
      const conditions = filterRules.map((rule, index) => {
        const varName = `filter${index}`;
        if (rule.type === 'class' && rule.values && rule.values.length > 0) {
          const valueList = rule.values.map(v => `"${v}"`).join(', ');
          return `    ?subject <${rule.predicate}> ?${varName} .
    FILTER(?${varName} IN (${valueList}))`;
        } else if (rule.type === 'regex' && rule.pattern) {
          return `    ?subject <${rule.predicate}> ?${varName} .
    FILTER(REGEX(STR(?${varName}), "${rule.pattern}", "i"))`;
        }
        return '';
      }).filter(c => c).join('\n');
      
      if (conditions) {
        filterConditions = '\n' + conditions;
      }
    }
    
    return `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
SELECT DISTINCT ?subject
WHERE {
  GRAPH <${graphName}> {
    ?subject rdf:type <${selectedType}> .${filterConditions}
  }
}`;
  };

  // Test the filter query to see how it affects predicate counts
  const handleTestFilterQuery = async () => {
    if (!selectedType) return;
    
    setTestingQuery(true);
    setError('');
    try {
      // Get filtered predicates to see the counts
      const response = await axios.get(`${API_URL}/sources/${sourceId}/predicates-filtered`, {
        params: { 
          type: selectedType,
          filters: JSON.stringify(filterRules)
        }
      });
      
      // Count subjects by making a simple query
      // For now, we'll use the predicate counts as a proxy
      const totalSubjects = response.data.predicates.length > 0 
        ? Math.max(...response.data.predicates.map((p: Predicate) => p.count))
        : 0;
      
      setTestQueryResults({
        subjectCount: totalSubjects,
        predicates: response.data.predicates
      });
      
      setSuccess('Test query executed successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to test filter query');
    } finally {
      setTestingQuery(false);
    }
  };

  // Handle step navigation
  const handleNext = async () => {
    setError('');
    
    if (currentStep === 1) {
      if (!selectedType) {
        setError('Please select an RDF type');
        return;
      }
      await loadInitialPredicates(selectedType);
      setCurrentStep(2);
    } else if (currentStep === 2) {
      // Merged step - move to predicate selection
      await loadFilteredPredicates();
      setCurrentStep(3);
    } else if (currentStep === 3) {
      if (selectedPaths.length === 0) {
        setError('Please select at least one predicate for translation');
        return;
      }
      setCurrentStep(4);
    } else if (currentStep === 4) {
      // This is handled by save button
    }
  };

  const handleBack = () => {
    setError('');
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Handle adding a class filter
  const handleAddClassFilter = (values: string[]) => {
    if (!selectedFilterPredicate || values.length === 0) return;
    
    const newFilter: FilterRule = {
      predicate: selectedFilterPredicate,
      type: 'class',
      values: values
    };
    
    // Remove existing filter for this predicate if any
    const updatedFilters = filterRules.filter(f => f.predicate !== selectedFilterPredicate);
    setFilterRules([...updatedFilters, newFilter]);
    setSelectedFilterPredicate(null);
    setFilterValues([]);
    setSelectedFilterValues([]);
    setSuccess('Filter added successfully');
    setTimeout(() => setSuccess(''), 3000);
  };

  // Handle toggling a filter value
  const handleToggleFilterValue = (value: string) => {
    if (selectedFilterValues.includes(value)) {
      setSelectedFilterValues(selectedFilterValues.filter(v => v !== value));
    } else {
      setSelectedFilterValues([...selectedFilterValues, value]);
    }
  };

  // Handle adding a regex filter
  const handleAddRegexFilter = () => {
    if (!selectedFilterPredicate || !regexPattern) return;
    
    const newFilter: FilterRule = {
      predicate: selectedFilterPredicate,
      type: 'regex',
      pattern: regexPattern
    };
    
    // Remove existing filter for this predicate if any
    const updatedFilters = filterRules.filter(f => f.predicate !== selectedFilterPredicate);
    setFilterRules([...updatedFilters, newFilter]);
    setSelectedFilterPredicate(null);
    setRegexPattern('');
    setSuccess('Regex filter added successfully');
    setTimeout(() => setSuccess(''), 3000);
  };

  // Handle removing a filter
  const handleRemoveFilter = (predicate: string) => {
    setFilterRules(filterRules.filter(f => f.predicate !== predicate));
  };

  // Handle predicate selection for translation
  const handlePredicateSelect = async (predicate: Predicate) => {
    const newPath: PredicatePath = {
      path: predicate.predicate,
      label: getUriLabel(predicate.predicate),
      isTranslatable: true,
      languageTag: predicate.languages && predicate.languages.length > 0 ? predicate.languages[0] : undefined,
      availableLanguages: predicate.languages
    };
    
    if (!selectedPaths.find(p => p.path === newPath.path)) {
      setSelectedPaths([...selectedPaths, newPath]);
    }
  };

  const handleRemovePath = (path: string) => {
    setSelectedPaths(selectedPaths.filter(p => p.path !== path));
  };

  const handleSetAsLabel = (path: string) => {
    setLabelField(path);
  };

  const handleToggleReference = (path: string) => {
    if (referenceFields.includes(path)) {
      setReferenceFields(referenceFields.filter(f => f !== path));
    } else {
      setReferenceFields([...referenceFields, path]);
    }
  };

  const handleLanguageChange = (pathString: string, language: string) => {
    setSelectedPaths(selectedPaths.map(p => 
      p.path === pathString ? { ...p, languageTag: language } : p
    ));
  };

  // Save configuration
  const handleSaveConfiguration = async () => {
    if (!selectedType) {
      setError('No RDF type selected');
      return;
    }
    
    if (!labelField) {
      setError('Please select a label field');
      return;
    }
    
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      const actualTranslatableFields = selectedPaths.map(p => p.path);
      
      const config: TranslationConfig = {
        types: [{
          type: selectedType,
          paths: selectedPaths,
          filters: filterRules.length > 0 ? filterRules : undefined
        }],
        labelField: labelField || undefined,
        referenceFields: referenceFields.length > 0 ? referenceFields : undefined,
        translatableFields: actualTranslatableFields.length > 0 ? actualTranslatableFields : undefined
      };
      
      await axios.put(`${API_URL}/sources/${sourceId}/config`, { config });
      setSuccess('Configuration saved successfully');
      
      setTimeout(() => {
        setSuccess('');
        onConfigSaved();
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Step 1: Select RDF Type
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Choose the RDF type that contains the terms you want to translate.
            </p>
            
            {loadingTypes ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {types.map((type) => (
                  <button
                    key={type.type}
                    onClick={() => setSelectedType(type.type)}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                      selectedType === type.type
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-mono text-gray-900 dark:text-white truncate flex-1">
                        {type.type.split('/').pop() || type.type}
                      </span>
                      <span className="text-xs bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded text-gray-700 dark:text-gray-300 ml-2">
                        {type.count} instances
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                      {type.type}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      
      case 2:
        return (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Step 2: Preview Predicates & Configure Filters
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Review predicates and optionally add filters to select a subset of instances.
            </p>
            
            {/* Predicate Preview */}
            <div className="mb-6">
              <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
                Available Predicates {testQueryResults ? '(After Filtering)' : '(All Instances)'}
              </h3>
              {loadingInitialPredicates ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {(testQueryResults ? testQueryResults.predicates : initialPredicates).map((pred) => (
                    <div
                      key={pred.predicate}
                      className="px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-mono text-gray-900 dark:text-white truncate flex-1">
                          {getUriLabel(pred.predicate)}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded text-gray-700 dark:text-gray-300">
                            {pred.count} values
                          </span>
                          {pred.sampleType === 'literal' && (
                            <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
                              Literal
                            </span>
                          )}
                          {pred.sampleType === 'uri' && (
                            <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                              URI
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Filter Configuration */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
                Configure Filters (Optional)
              </h3>
              
              {/* Active Filters */}
              {filterRules.length > 0 && (
                <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">Active Filters</h4>
                  <div className="space-y-2">
                    {filterRules.map((rule, index) => (
                      <div key={index} className="flex items-center justify-between bg-white dark:bg-gray-800 rounded px-3 py-2">
                        <div className="flex-1">
                          <span className="text-xs font-mono text-gray-600 dark:text-gray-400">
                            {getUriLabel(rule.predicate)}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-500 mx-2">•</span>
                          {rule.type === 'class' && (
                            <span className="text-xs text-gray-700 dark:text-gray-300">
                              Values: {rule.values?.join(', ')}
                            </span>
                          )}
                          {rule.type === 'regex' && (
                            <span className="text-xs text-gray-700 dark:text-gray-300">
                              Pattern: {rule.pattern}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemoveFilter(rule.predicate)}
                          className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Add New Filter */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Predicate to Filter
                </label>
                <select
                  value={selectedFilterPredicate || ''}
                  onChange={(e) => {
                    setSelectedFilterPredicate(e.target.value);
                    if (e.target.value) {
                      loadFilterValues(e.target.value);
                    }
                  }}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                >
                  <option value="">-- Select a predicate --</option>
                  {filterablePredicates.map((pred) => (
                    <option key={pred.predicate} value={pred.predicate}>
                      {getUriLabel(pred.predicate)} ({pred.count} values)
                    </option>
                  ))}
                </select>
              </div>
              
              {selectedFilterPredicate && (
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-4">
                  {loadingFilterValues ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                    </div>
                  ) : filterValuesTotal < 50 ? (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                        Class Filter: Select Values ({filterValuesTotal} unique)
                      </h3>
                      <div className="space-y-1 max-h-48 overflow-y-auto mb-4">
                        {filterValues.map((fv) => (
                          <label key={fv.value} className="flex items-center gap-2 px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedFilterValues.includes(fv.value)}
                              onChange={() => handleToggleFilterValue(fv.value)}
                              className="rounded"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">{fv.value}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">({fv.count})</span>
                          </label>
                        ))}
                      </div>
                      <button
                        onClick={() => handleAddClassFilter(selectedFilterValues)}
                        disabled={selectedFilterValues.length === 0}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Add Class Filter
                      </button>
                    </div>
                  ) : (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                        Regex Filter ({filterValuesTotal}+ unique values)
                      </h3>
                      <input
                        type="text"
                        value={regexPattern}
                        onChange={(e) => setRegexPattern(e.target.value)}
                        placeholder="Enter regex pattern (e.g., .*test.*)"
                        className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white mb-2"
                      />
                      <button
                        onClick={handleAddRegexFilter}
                        disabled={!regexPattern}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Add Regex Filter
                      </button>
                    </div>
                  )}
                </div>
              )}
              
              {/* SPARQL Query Viewer and Test */}
              {filterRules.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                      Generated SPARQL Query
                    </h4>
                    <button
                      onClick={() => setShowSparqlQuery(!showSparqlQuery)}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {showSparqlQuery ? 'Hide' : 'Show'} Query
                    </button>
                  </div>
                  
                  {showSparqlQuery && (
                    <pre className="bg-gray-900 text-green-400 p-3 rounded text-xs overflow-x-auto mb-3 font-mono">
                      {buildSparqlQuery()}
                    </pre>
                  )}
                  
                  <button
                    onClick={handleTestFilterQuery}
                    disabled={testingQuery}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {testingQuery ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Testing Query...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        Test Filter & Update Counts
                      </>
                    )}
                  </button>
                  
                  {testQueryResults && (
                    <div className="mt-3 text-sm text-gray-700 dark:text-gray-300">
                      <p className="font-semibold">Test Results:</p>
                      <p>Predicates after filtering: {testQueryResults.predicates.length}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        The predicate counts above have been updated to reflect your filters.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      
      case 3:
        return (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Step 3: Select Translatable Predicates
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Choose which predicates should be translatable. {filterRules.length > 0 && 'Counts reflect applied filters.'}
            </p>
            
            {loadingFilteredPredicates ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              </div>
            ) : (
              <>
                <div className="space-y-2 max-h-64 overflow-y-auto mb-6">
                  {filteredPredicates.filter(p => p.sampleType === 'literal' || p.sampleType === 'typed-literal').map((pred) => (
                    <button
                      key={pred.predicate}
                      onClick={() => handlePredicateSelect(pred)}
                      disabled={selectedPaths.some(p => p.path === pred.predicate)}
                      className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                        selectedPaths.some(p => p.path === pred.predicate)
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 cursor-not-allowed'
                          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-mono text-gray-900 dark:text-white truncate flex-1">
                          {pred.predicate.split('/').pop() || pred.predicate}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded text-gray-700 dark:text-gray-300">
                            {pred.count} values
                          </span>
                          {selectedPaths.some(p => p.path === pred.predicate) && (
                            <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                
                {selectedPaths.length > 0 && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                      Selected Paths ({selectedPaths.length})
                    </h3>
                    <div className="space-y-1">
                      {selectedPaths.map((path) => (
                        <div key={path.path} className="flex items-center justify-between bg-white dark:bg-gray-800 rounded px-3 py-2">
                          <span className="text-xs font-mono text-gray-700 dark:text-gray-300">
                            {path.label}
                          </span>
                          <button
                            onClick={() => handleRemovePath(path.path)}
                            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        );
      
      case 4:
        return (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Step 4: Assign Roles
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Assign roles to your selected predicates. Each path needs a role: Label (identifier), Reference (additional info), or Translatable.
            </p>
            
            <div className="space-y-2">
              {selectedPaths.map((path) => (
                <div
                  key={path.path}
                  className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-mono text-gray-900 dark:text-white">
                          {path.label}
                        </div>
                        {path.path === labelField && (
                          <span className="text-xs px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded font-semibold">
                            LABEL
                          </span>
                        )}
                        {referenceFields.includes(path.path) && (
                          <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded font-semibold">
                            REFERENCE
                          </span>
                        )}
                        <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded font-semibold">
                          TRANSLATABLE
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSetAsLabel(path.path)}
                        disabled={path.path === labelField}
                        className={`text-xs px-2 py-1 rounded transition-colors ${
                          path.path === labelField
                            ? 'bg-yellow-200 dark:bg-yellow-900/50 text-yellow-900 dark:text-yellow-200 cursor-not-allowed'
                            : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-yellow-100 dark:hover:bg-yellow-900/30'
                        }`}
                      >
                        Set as Label
                      </button>
                      <button
                        onClick={() => handleToggleReference(path.path)}
                        className={`text-xs px-2 py-1 rounded transition-colors ${
                          referenceFields.includes(path.path)
                            ? 'bg-blue-200 dark:bg-blue-900/50 text-blue-900 dark:text-blue-200'
                            : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                        }`}
                      >
                        {referenceFields.includes(path.path) ? 'Unmark Ref' : 'Mark as Ref'}
                      </button>
                    </div>
                  </div>
                  {/* Language selector if languages are available */}
                  {path.availableLanguages && path.availableLanguages.length > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <label className="text-xs text-gray-600 dark:text-gray-400">
                        Language:
                      </label>
                      <select
                        value={path.languageTag || path.availableLanguages?.[0] || ''}
                        onChange={(e) => handleLanguageChange(path.path, e.target.value)}
                        className="text-xs px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white font-mono"
                      >
                        {path.availableLanguages && path.availableLanguages.map(lang => (
                          <option key={lang} value={lang}>{lang}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      {/* Progress Indicator */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
            <div key={step} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  step < currentStep
                    ? 'bg-green-500 text-white'
                    : step === currentStep
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}
              >
                {step < currentStep ? <Check className="w-4 h-4" /> : step}
              </div>
              {step < totalSteps && (
                <div
                  className={`h-1 w-12 mx-2 ${
                    step < currentStep ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="text-xs text-gray-600 dark:text-gray-400 text-center">
          Step {currentStep} of {totalSteps}
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}
      
      {success && (
        <div className="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 flex items-start gap-2">
          <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-800 dark:text-green-200">{success}</p>
        </div>
      )}

      {/* Step Content */}
      <div className="mb-6">
        {renderStepContent()}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleBack}
          disabled={currentStep === 1}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        
        <div className="flex gap-2">
          {currentStep < totalSteps ? (
            <button
              onClick={handleNext}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSaveConfiguration}
              disabled={saving || !labelField}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Configuration
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
