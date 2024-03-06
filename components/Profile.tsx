import React from 'react';

// Define the type for a single post
type Post = {
  _id: string;
  // Add other properties of a post here
};

// Define the type for the Profile component's props
type ProfileProps = {
  name: string;
  desc: string;
  data: Post[];
  handleEdit?: (post: Post) => void;
  handleDelete?: (post: Post) => void;
};

const Profile: React.FC<ProfileProps> = ({ name, desc, data, handleEdit, handleDelete }) => {
  return (
    <section className='w-full'>
      <h1 className='head_text text-left'>
        <span className='blue_gradient'>{name} Profile</span>
      </h1>
      <p className='desc text-left'>{desc}</p>

    </section>
  );
};

export default Profile;