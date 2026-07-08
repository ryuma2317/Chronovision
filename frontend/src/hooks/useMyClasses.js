import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import * as studentApi from '../lib/endpoints/student';
import * as teacherApi from '../lib/endpoints/teacher';

// Returns the logged-in user's classes (student enrollments or teacher assignments)
export default function useMyClasses() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState('');

  useEffect(() => {
    let active = true;
    const fetcher = user?.role === 'teacher' ? teacherApi.getMyClasses : studentApi.getMyClasses;
    fetcher()
      .then((data) => {
        if (!active) return;
        setClasses(data);
        if (data.length > 0) setSelectedClassId(data[0].class_id);
      })
      .finally(() => active && setIsLoading(false));
    return () => { active = false; };
  }, [user?.role]);

  return { classes, isLoading, selectedClassId, setSelectedClassId };
}
