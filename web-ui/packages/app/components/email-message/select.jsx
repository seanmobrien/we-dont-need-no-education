import React, { useState, useEffect } from 'react';
import { debounce } from 'lodash';
import { fetch } from '@/lib/nextjs-util/fetch';
import { LoggedError } from '@compliance-theater/logger';
const classnames = (...classes) => {
    return classes.filter(Boolean).join(' ');
};
const EmailSelect = ({ selectedEmail, onEmailSelect, id: ariaTargetId }) => {
    const [query, setQuery] = useState('');
    const [emails, setEmails] = useState([]);
    const [loading, setLoading] = useState(false);
    const [inEditMode, setInEditMode] = useState(false);
    const [selectedEmailDetails, setSelectedEmailDetails] = useState(null);
    useEffect(() => {
        if (query.length < 3) {
            setEmails([]);
            return;
        }
        const fetchEmails = debounce(async () => {
            setLoading(true);
            try {
                const response = await fetch(`/api/email/search?query=${query}&num=20`);
                if (!response.ok) {
                    throw new Error('Failed to fetch emails');
                }
                const data = await response.json();
                if (!Array.isArray(data.results)) {
                    throw new Error('Invalid response data');
                }
                setEmails(data.results);
            }
            catch (error) {
                LoggedError.isTurtlesAllTheWayDownBaby(error, {
                    log: true,
                    source: 'email-select',
                });
            }
            finally {
                setLoading(false);
            }
        }, 300);
        fetchEmails();
        return () => fetchEmails.cancel();
    }, [query]);
    useEffect(() => {
        if (typeof selectedEmail === 'string') {
            const fetchEmailDetails = async () => {
                setLoading(true);
                try {
                    const response = await fetch(`/api/email/${selectedEmail}`);
                    if (!response.ok) {
                        throw new Error('Failed to fetch email details');
                    }
                    const data = await response.json();
                    setSelectedEmailDetails(data);
                }
                catch (error) {
                    LoggedError.isTurtlesAllTheWayDownBaby(error, {
                        log: true,
                        source: 'email-select',
                    });
                }
                finally {
                    setLoading(false);
                }
            };
            fetchEmailDetails();
        }
        else {
            setSelectedEmailDetails(selectedEmail || null);
        }
    }, [selectedEmail]);
    const handleSelect = (event) => {
        const selectedEmailId = event.target.value?.trim();
        if (!!selectedEmailId) {
            onEmailSelect(selectedEmailId);
            setInEditMode(false);
        }
    };
    const showSearchBox = inEditMode || selectedEmail == null;
    return (<div>
      {showSearchBox ? (<input id={ariaTargetId} type="text" list="email-options" value={query} onChange={(e) => setQuery(e.target.value)} onSelect={handleSelect} placeholder="Search emails..."/>) : (!inEditMode && (<>
            <a id={ariaTargetId} href="#" onClick={() => setInEditMode(true)} className={classnames('mr-2')}>
              Edit
            </a>
            <a href="#" onClick={() => onEmailSelect(null)} className={classnames('ml-2')}>
              Clear
            </a>
          </>))}
      <datalist id="email-options">
        {emails.map((email) => (<option key={email.emailId} value={email.emailId}>
            {email.sender.name}: {email.subject},{' '}
            {new Date(email.sentOn).toLocaleString()}
          </option>))}
      </datalist>
      {loading && <p>Loading...</p>}
      {selectedEmailDetails && (<div>
          <h3>{selectedEmailDetails.subject}</h3>
          <p>
            From: {selectedEmailDetails.sender.name} (
            {selectedEmailDetails.sender.email})
          </p>
          <p>
            Sent on: {new Date(selectedEmailDetails.sentOn).toLocaleString()}
          </p>
        </div>)}
    </div>);
};
export default EmailSelect;
//# sourceMappingURL=select.jsx.map