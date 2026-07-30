import { useParams } from 'react-router-dom';
import CreatePostPage from '../CreatePostPage/CreatePostPage';

export default function EditPostPage() {
  return <CreatePostPage isEdit />;
}
